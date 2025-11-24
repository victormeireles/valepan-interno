import { NextResponse } from 'next/server';
import { getGoogleSheetsClient } from '@/lib/googleSheets';
import { SAIDAS_SHEET_CONFIG, SAIDAS_SHEET_COLUMNS } from '@/config/saidas';
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
      // Dados de foto
      fotoUrl,
      fotoId,
    } = body;

    // Validar dados
    if (caixas < 0 || pacotes < 0 || unidades < 0 || kg < 0) {
      return NextResponse.json({ error: 'Valores não podem ser negativos' }, { status: 400 });
    }

    const { spreadsheetId, tabName } = SAIDAS_SHEET_CONFIG.destino;
    const sheets = await getGoogleSheetsClient();
    
    // 1. Buscar dados completos da linha original
    const rangeOriginal = `${tabName}!A${rowNumber}:Q${rowNumber}`;
    const responseOriginal = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: rangeOriginal,
    });

    const originalValues = responseOriginal.data.values?.[0] || [];
    
    if (originalValues.length === 0) {
      return NextResponse.json({ error: 'Saída original não encontrada' }, { status: 404 });
    }

    // Extrair dados originais
    const data = originalValues[SAIDAS_SHEET_COLUMNS.data] || '';
    const cliente = originalValues[SAIDAS_SHEET_COLUMNS.cliente] || '';
    const observacao = originalValues[SAIDAS_SHEET_COLUMNS.observacao] || '';
    const produto = originalValues[SAIDAS_SHEET_COLUMNS.produto] || '';
    const metaCaixas = Number(originalValues[SAIDAS_SHEET_COLUMNS.meta.caixas] || 0);
    const metaPacotes = Number(originalValues[SAIDAS_SHEET_COLUMNS.meta.pacotes] || 0);
    const metaUnidades = Number(originalValues[SAIDAS_SHEET_COLUMNS.meta.unidades] || 0);
    const metaKg = Number(originalValues[SAIDAS_SHEET_COLUMNS.meta.kg] || 0);
    const createdAt = originalValues[SAIDAS_SHEET_COLUMNS.createdAt] || '';

    // 2. Validar que realizado é menor que meta em pelo menos um campo
    const isPartial = (
      (metaCaixas > 0 && caixas < metaCaixas) ||
      (metaPacotes > 0 && pacotes < metaPacotes) ||
      (metaUnidades > 0 && unidades < metaUnidades) ||
      (metaKg > 0 && kg < metaKg)
    );

    if (!isPartial) {
      return NextResponse.json({ 
        error: 'Saída não é parcial. Use o botão "Salvar" normal.' 
      }, { status: 400 });
    }

    // 3. Calcular novo valor da meta da linha original (descontar o realizado)
    const novaMetaCaixas = Math.max(0, metaCaixas - caixas);
    const novaMetaPacotes = Math.max(0, metaPacotes - pacotes);
    const novaMetaUnidades = Math.max(0, metaUnidades - unidades);
    const novaMetaKg = Math.max(0, metaKg - kg);

    // 4. Atualizar APENAS colunas E-H da linha original (meta) - NÃO TOCAR no realizado (K-N)
    const rangeMeta = `${tabName}!E${rowNumber}:H${rowNumber}`;
    const valuesMeta = [
      novaMetaCaixas || 0,      // E - meta caixas
      novaMetaPacotes || 0,     // F - meta pacotes
      novaMetaUnidades || 0,    // G - meta unidades
      novaMetaKg || 0,          // H - meta kg
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: rangeMeta,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [valuesMeta]
      }
    });

    // 5. Criar nova linha com o realizado parcial
    const now = new Date().toISOString();
    const novaLinhaValues = [
      data,                      // A (0) - data (copiado)
      cliente,                   // B (1) - cliente (copiado)
      observacao,                // C (2) - observacao (copiado)
      produto,                   // D (3) - produto (copiado)
      caixas || 0,               // E (4) - meta caixas = realizado
      pacotes || 0,              // F (5) - meta pacotes = realizado
      unidades || 0,             // G (6) - meta unidades = realizado
      kg || 0,                   // H (7) - meta kg = realizado
      createdAt || now,          // I (8) - created_at (copiado ou novo)
      now,                       // J (9) - updated_at (novo)
      caixas || 0,               // K (10) - realizado caixas
      pacotes || 0,              // L (11) - realizado pacotes
      unidades || 0,             // M (12) - realizado unidades
      kg || 0,                   // N (13) - realizado kg
      now,                       // O (14) - saida_updated_at
      fotoUrl || '',             // P (15) - foto_url
      fotoId || '',              // Q (16) - foto_id
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
    const updatedRange = appendResponse.data.updates?.updatedRange || '';
    const match = updatedRange.match(/!A(\d+):/);
    const novaLinhaRowId = match ? parseInt(match[1]) : null;

    // Calcular meta original (soma dos valores originais + valores salvos)
    const metaOriginalCaixas = metaCaixas;
    const metaOriginalPacotes = metaPacotes;
    const metaOriginalUnidades = metaUnidades;
    const metaOriginalKg = metaKg;

    // Obter tipo de estoque do cliente
    const tipoEstoque = await estoqueService.obterTipoEstoqueCliente(cliente);
    const clienteEstoque = tipoEstoque ?? cliente;

    // Atualizar estoque (aplicar delta negativo para saidas usando tipo de estoque)
    await estoqueService.aplicarDelta({
      cliente: clienteEstoque,
      produto,
      delta: {
        caixas: -(caixas || 0),
        pacotes: -(pacotes || 0),
        unidades: -(unidades || 0),
        kg: -(kg || 0),
      },
    });

    try {
      await whatsAppNotificationService.notifySaidasProduction({
        produto,
        cliente,
        meta: {
          caixas: metaOriginalCaixas,
          pacotes: metaOriginalPacotes,
          unidades: metaOriginalUnidades,
          kg: metaOriginalKg,
        },
        realizado: {
          caixas: caixas || 0,
          pacotes: pacotes || 0,
          unidades: unidades || 0,
          kg: kg || 0,
        },
        data,
        observacao: observacao || undefined,
        origem: 'atualizada',
        fotoUrl: fotoUrl || undefined,
      });
    } catch (_error) {
      // Erro ao enviar notificação WhatsApp - silenciosamente ignorado
    }

    return NextResponse.json({ 
      message: 'Saída parcial salva com sucesso',
      novaLinhaRowId, // Retornar o rowId da nova linha para o frontend
      linhaOriginal: {
        novaMeta: {
          caixas: novaMetaCaixas,
          pacotes: novaMetaPacotes,
          unidades: novaMetaUnidades,
          kg: novaMetaKg,
        }
      },
      novaLinha: {
        meta: { caixas, pacotes, unidades, kg },
        realizado: { caixas, pacotes, unidades, kg },
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

