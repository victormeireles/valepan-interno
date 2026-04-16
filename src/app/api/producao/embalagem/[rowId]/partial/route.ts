import { NextResponse } from 'next/server';
import { getGoogleSheetsClient } from '@/lib/googleSheets';
import { PEDIDOS_EMBALAGEM_CONFIG } from '@/config/embalagem';
import { whatsAppNotificationService } from '@/lib/services/whatsapp-notification-service';
import { estoqueService } from '@/lib/services/estoque-service';

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
    const lote = originalValues[26] || '';              // AA - Lote (copiar)
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

    // 3. Calcular novo valor do pedido da linha original (descontar o produzido)
    const novoPedidoCaixas = Math.max(0, pedidoCaixas - c);
    const novoPedidoPacotes = Math.max(0, pedidoPacotes - p);
    const novoPedidoUnidades = Math.max(0, pedidoUnidades - u);
    const novoPedidoKg = Math.max(0, pedidoKg - k);

    // 4. Atualizar APENAS colunas G-J da linha original (pedido) - NÃO TOCAR na produção (M-Q)
    const rangePedido = `${tabName}!G${rowNumber}:J${rowNumber}`;
    const valuesPedido = [
      novoPedidoCaixas || 0,      // G - caixas
      novoPedidoPacotes || 0,     // H - pacotes
      novoPedidoUnidades || 0,    // I - unidades
      novoPedidoKg || 0,          // J - kg
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: rangePedido,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [valuesPedido]
      }
    });

    // 5. Criar nova linha
    const now = new Date().toISOString();
    const novaLinhaValues = [
      dataPedido,           // A - data_pedido (copiado)
      dataFabricacao,       // B - data_fabricacao (copiado)
      cliente,              // C - cliente (copiado)
      observacao,           // D - observacao (copiado)
      produto,              // E - produto (copiado)
      congelado,            // F - congelado (copiado)
      c,                    // G - caixas pedido = produzido
      p,                    // H - pacotes pedido = produzido
      u,                    // I - unidades pedido = produzido
      k,                    // J - kg pedido = produzido
      now,                  // K - created_at (novo)
      now,                  // L - updated_at (novo)
      // M-Q produção (valores preenchidos pelo usuário)
      c,                    // M - producao_caixas
      p,                    // N - producao_pacotes
      u,                    // O - producao_unidades
      k,                    // P - producao_kg
      now,                  // Q - producao_updated_at
      // R-Z fotos (dados das fotos)
      pacoteFotoUrl || '',         // R - pacote_foto_url
      pacoteFotoId || '',          // S - pacote_foto_id
      pacoteFotoUploadedAt || '',  // T - pacote_foto_uploaded_at
      etiquetaFotoUrl || '',       // U - etiqueta_foto_url
      etiquetaFotoId || '',        // V - etiqueta_foto_id
      etiquetaFotoUploadedAt || '',// W - etiqueta_foto_uploaded_at
      palletFotoUrl || '',         // X - pallet_foto_url
      palletFotoId || '',          // Y - pallet_foto_id
      palletFotoUploadedAt || '', // Z - pallet_foto_uploaded_at
      lote || '',                  // AA (26) - Lote (copiado da linha original)
      etiquetaGerada || '',        // AB (27) - Etiqueta Gerada (copiada da linha original)
      obsEmbalagem || '',          // AC (28) - Obs embalagem
    ];

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

    // Obter tipo de estoque do cliente
    const tipoEstoque = await estoqueService.obterTipoEstoqueCliente(cliente);
    const clienteEstoque = tipoEstoque ?? cliente;

    await estoqueService.aplicarDelta({
      cliente: clienteEstoque,
      produto,
      delta: {
        caixas: c,
        pacotes: p,
        unidades: u,
        kg: k,
      },
    });

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
        novoPedido: {
          caixas: novoPedidoCaixas,
          pacotes: novoPedidoPacotes,
          unidades: novoPedidoUnidades,
          kg: novoPedidoKg,
        }
      },
      novaLinha: {
        pedido: { caixas: c, pacotes: p, unidades: u, kg: k },
        producao: { caixas: c, pacotes: p, unidades: u, kg: k },
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
