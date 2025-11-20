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
    if (caixas < 0 || pacotes < 0 || unidades < 0 || kg < 0) {
      return NextResponse.json({ error: 'Valores não podem ser negativos' }, { status: 400 });
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
      (pedidoCaixas > 0 && caixas < pedidoCaixas) ||
      (pedidoPacotes > 0 && pacotes < pedidoPacotes) ||
      (pedidoUnidades > 0 && unidades < pedidoUnidades) ||
      (pedidoKg > 0 && kg < pedidoKg)
    );

    if (!isPartial) {
      return NextResponse.json({ 
        error: 'Produção não é parcial. Use o botão "Salvar Produção" normal.' 
      }, { status: 400 });
    }

    // 3. Calcular novo valor do pedido da linha original (descontar o produzido)
    const novoPedidoCaixas = Math.max(0, pedidoCaixas - caixas);
    const novoPedidoPacotes = Math.max(0, pedidoPacotes - pacotes);
    const novoPedidoUnidades = Math.max(0, pedidoUnidades - unidades);
    const novoPedidoKg = Math.max(0, pedidoKg - kg);

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
      caixas || 0,          // G - caixas pedido = produzido
      pacotes || 0,         // H - pacotes pedido = produzido
      unidades || 0,        // I - unidades pedido = produzido
      kg || 0,              // J - kg pedido = produzido
      now,                  // K - created_at (novo)
      now,                  // L - updated_at (novo)
      // M-Q produção (valores preenchidos pelo usuário)
      caixas || 0,          // M - producao_caixas
      pacotes || 0,         // N - producao_pacotes
      unidades || 0,        // O - producao_unidades
      kg || 0,              // P - producao_kg
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
    const metaOriginalCaixas = pedidoCaixas + (caixas || 0);
    const metaOriginalPacotes = pedidoPacotes + (pacotes || 0);
    const metaOriginalUnidades = pedidoUnidades + (unidades || 0);
    const metaOriginalKg = pedidoKg + (kg || 0);

    await estoqueService.aplicarDelta({
      cliente,
      produto,
      delta: {
        caixas: caixas || 0,
        pacotes: pacotes || 0,
        unidades: unidades || 0,
        kg: kg || 0,
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
          caixas: caixas || 0,
          pacotes: pacotes || 0,
          unidades: unidades || 0,
          kg: kg || 0,
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
    } catch (error) {
      // Logar erro mas não propagar
      console.error("Erro ao enviar notificação WhatsApp:", error);
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
        pedido: { caixas, pacotes, unidades, kg },
        producao: { caixas, pacotes, unidades, kg },
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
