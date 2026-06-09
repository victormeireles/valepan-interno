import { NextResponse } from 'next/server';
import { getGoogleSheetsClient } from '@/lib/googleSheets';
import { PEDIDOS_EMBALAGEM_CONFIG } from '@/config/embalagem';
import { buildEmbalagemRealizadoSheetRowValues } from '@/domain/embalagem/pedido-sheet-ops';
import { whatsAppNotificationService } from '@/lib/services/whatsapp-notification-service';
import { estoqueService } from '@/lib/services/estoque-service';
import {
  embalagemLoteService,
  EstoqueResolverError,
} from '@/lib/services/embalagem-lote-service';

export async function POST(
  request: Request,
  context: { params: Promise<{ rowId: string }> }
) {
  try {
    const { rowId } = await context.params;
    const rowNumber = parseInt(rowId);
    
    if (isNaN(rowNumber) || rowNumber < 2) {
      return NextResponse.json({ error: 'ID de linha inválido' }, { status: 400 });
    }

    const body = await request.json();
    const { 
      caixas, 
      pacotes, 
      unidades, 
      kg,
      obsEmbalagem,
      // Dados de fotos
      pacoteFotoUrl,
      pacoteFotoId,
      pacoteFotoUploadedAt,
      etiquetaFotoUrl,
      etiquetaFotoId,
      etiquetaFotoUploadedAt,
      palletFotoUrl,
      palletFotoId,
      palletFotoUploadedAt,
    } = body;

    // Validar dados
    const c = Number(caixas) || 0;
    const p = Number(pacotes) || 0;
    const u = Number(unidades) || 0;
    const k = Number(kg) || 0;

    if (c < 0 || p < 0 || u < 0 || k < 0) {
      return NextResponse.json({ error: 'Valores não podem ser negativos' }, { status: 400 });
    }

    if (c + p + u + k <= 0) {
      return NextResponse.json(
        { error: 'Informe ao menos uma quantidade maior que zero (cx, pct, un ou kg).' },
        { status: 400 },
      );
    }

    const { spreadsheetId, tabName } = PEDIDOS_EMBALAGEM_CONFIG.destinoPedidos;
    const sheets = await getGoogleSheetsClient();
    
    // 1. Buscar dados completos da linha original (colunas A-AB para incluir Lote e Etiqueta Gerada)
    const rangeOriginal = `${tabName}!A${rowNumber}:AB${rowNumber}`;
    const responseOriginal = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: rangeOriginal,
    });

    const originalValues = responseOriginal.data.values?.[0] || [];
    
    if (originalValues.length === 0) {
      return NextResponse.json({ error: 'Pedido original não encontrado' }, { status: 404 });
    }

    // Extrair dados originais
    const dataPedido = originalValues[0] || '';          // A
    const dataFabricacao = originalValues[1] || '';      // B
    const cliente = originalValues[2] || '';             // C
    const observacao = originalValues[3] || '';          // D
    const produto = originalValues[4] || '';             // E
    const congelado = originalValues[5] || 'Não';        // F
    const pedidoCaixas = Number(originalValues[6] || 0);    // G
    const pedidoPacotes = Number(originalValues[7] || 0);   // H
    const pedidoUnidades = Number(originalValues[8] || 0);  // I
    const pedidoKg = Number(originalValues[9] || 0);        // J
    const lotePlanilha = originalValues[26] || '';       // AA - Lote (copiar)
    const etiquetaGerada = originalValues[27] || '';    // AB - Etiqueta Gerada (copiar)

    // 2. Validar que produção é menor que pedido em pelo menos um campo
    const isPartial = (
      (pedidoCaixas > 0 && c < pedidoCaixas) ||
      (pedidoPacotes > 0 && p < pedidoPacotes) ||
      (pedidoUnidades > 0 && u < pedidoUnidades) ||
      (pedidoKg > 0 && k < pedidoKg)
    );

    if (!isPartial) {
      return NextResponse.json({ 
        error: 'Produção não é parcial. Use o botão "Salvar Produção" normal.' 
      }, { status: 400 });
    }

    try {
      await embalagemLoteService.resolveIds(cliente.toString(), produto.toString());
    } catch (e) {
      if (e instanceof EstoqueResolverError) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      throw e;
    }

    // 3. Criar nova linha de realizado (meta permanece na linha original — G–J intactos)
    const now = new Date().toISOString();
    const novaLinhaValues = buildEmbalagemRealizadoSheetRowValues({
      dataPedido: dataPedido.toString(),
      dataFabricacao: dataFabricacao.toString(),
      cliente: cliente.toString(),
      observacao: observacao.toString(),
      produto: produto.toString(),
      congelado: congelado.toString(),
      quantidade: { caixas: c, pacotes: p, unidades: u, kg: k },
      produzidoEm: now,
      obsEmbalagem: obsEmbalagem || '',
      lote: lotePlanilha,
      etiquetaGerada,
      fotos: {
        pacoteFotoUrl: pacoteFotoUrl || undefined,
        pacoteFotoId: pacoteFotoId || undefined,
        pacoteFotoUploadedAt: pacoteFotoUploadedAt || undefined,
        etiquetaFotoUrl: etiquetaFotoUrl || undefined,
        etiquetaFotoId: etiquetaFotoId || undefined,
        etiquetaFotoUploadedAt: etiquetaFotoUploadedAt || undefined,
        palletFotoUrl: palletFotoUrl || undefined,
        palletFotoId: palletFotoId || undefined,
        palletFotoUploadedAt: palletFotoUploadedAt || undefined,
      },
    });

    // Inserir nova linha
    const appendResponse = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${tabName}!A:A`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [novaLinhaValues]
      }
    });
    
    // Calcular o rowId da nova linha criada
    // O range retornado tem formato: 'Pedido de embalagem!A253:Z253'
    const updatedRange = appendResponse.data.updates?.updatedRange || '';
    const match = updatedRange.match(/!A(\d+):/);
    const novaLinhaRowId = match ? parseInt(match[1]) : null;

    // Calcular meta original (soma dos valores originais + valores salvos)
    const metaOriginalCaixas = pedidoCaixas + c;
    const metaOriginalPacotes = pedidoPacotes + p;
    const metaOriginalUnidades = pedidoUnidades + u;
    const metaOriginalKg = pedidoKg + k;

    if (!novaLinhaRowId) {
      return NextResponse.json(
        { error: 'Não foi possível determinar a linha criada na planilha' },
        { status: 500 },
      );
    }

    const tipoEstoque = await estoqueService.obterTipoEstoqueCliente(cliente);
    const clienteEstoque = tipoEstoque ?? cliente;

    let loteId: string | undefined;
    try {
      const loteRecord = await embalagemLoteService.criarLoteParcial({
        planilhaRowId: novaLinhaRowId,
        planilhaRowIdOrigem: rowNumber,
        dataPedido: dataPedido.toString(),
        dataFabricacao: dataFabricacao.toString(),
        cliente: cliente.toString(),
        produto: produto.toString(),
        congelado: congelado.toString(),
        lote: lotePlanilha,
        observacaoCliente: observacao.toString(),
        quantidade: { caixas: c, pacotes: p, unidades: u, kg: k },
        produzidoEm: now,
        obsEmbalagem: obsEmbalagem || '',
        fotos: {
          pacoteFotoUrl: pacoteFotoUrl || undefined,
          pacoteFotoId: pacoteFotoId || undefined,
          pacoteFotoUploadedAt: pacoteFotoUploadedAt || undefined,
          etiquetaFotoUrl: etiquetaFotoUrl || undefined,
          etiquetaFotoId: etiquetaFotoId || undefined,
          etiquetaFotoUploadedAt: etiquetaFotoUploadedAt || undefined,
          palletFotoUrl: palletFotoUrl || undefined,
          palletFotoId: palletFotoId || undefined,
          palletFotoUploadedAt: palletFotoUploadedAt || undefined,
        },
      });
      loteId = loteRecord.id;

      await estoqueService.aplicarDelta({
        cliente: clienteEstoque,
        produto: produto.toString(),
        delta: { caixas: c, pacotes: p, unidades: u, kg: k },
        origem: 'embalagem',
        embalagemLoteId: loteId,
      });
    } catch (dbError) {
      if (loteId) {
        await embalagemLoteService.compensarLote(loteId).catch(() => undefined);
      }
      throw dbError;
    }

    try {
      // ObsEmbalagem já está na nova linha criada, buscar dela se necessário
      // Como a nova linha foi criada agora, a obsEmbalagem já está no array novaLinhaValues
      const obsEmbalagemValue = obsEmbalagem || '';
      
      await whatsAppNotificationService.notifyEmbalagemProduction({
        produto,
        cliente,
        quantidadeEmbalada: {
          caixas: c,
          pacotes: p,
          unidades: u,
          kg: k,
        },
        metaOriginal: {
          caixas: metaOriginalCaixas,
          pacotes: metaOriginalPacotes,
          unidades: metaOriginalUnidades,
          kg: metaOriginalKg,
        },
        isPartial: true,
        fotos: {
          pacoteFotoUrl: pacoteFotoUrl || undefined,
          etiquetaFotoUrl: etiquetaFotoUrl || undefined,
          palletFotoUrl: palletFotoUrl || undefined,
        } as { pacoteFotoUrl?: string; etiquetaFotoUrl?: string; palletFotoUrl?: string },
        obsEmbalagem: obsEmbalagemValue || undefined,
      });
    } catch {
      // Erro ao enviar notificação WhatsApp - silenciosamente ignorado
    }

    return NextResponse.json({ 
      message: 'Produção parcial salva com sucesso',
      novaLinhaRowId, // Retornar o rowId da nova linha para o frontend
      linhaOriginal: {
        pedido: {
          caixas: pedidoCaixas,
          pacotes: pedidoPacotes,
          unidades: pedidoUnidades,
          kg: pedidoKg,
        },
      },
      novaLinha: {
        pedido: { caixas: 0, pacotes: 0, unidades: 0, kg: 0 },
        producao: { caixas: c, pacotes: p, unidades: u, kg: k },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
