import { NextResponse } from 'next/server';
import { getGoogleSheetsClient } from '@/lib/googleSheets';
import { PEDIDOS_FERMENTACAO_CONFIG } from '@/config/fermentacao';
import { whatsAppNotificationService } from '@/lib/services/whatsapp-notification-service';

type FermentacaoMeta = {
  latas: number;
  unidades: number;
  kg: number;
};

type FermentacaoRowInfo = {
  produto: string;
  data?: string;
  meta: FermentacaoMeta;
};

function formatDateToBr(value: unknown): string | undefined {
  if (!value) {
    return undefined;
  }

  const raw = value.toString().trim();
  if (!raw) {
    return undefined;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    return raw;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split('-');
    return `${day}/${month}/${year}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat('pt-BR').format(parsed);
  }

  return raw;
}

function formatDateTimeToBr(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

async function loadFermentacaoRowInfo(
  sheets: Awaited<ReturnType<typeof getGoogleSheetsClient>>,
  spreadsheetId: string,
  tabName: string,
  rowNumber: number,
): Promise<FermentacaoRowInfo> {
  const range = `${tabName}!A${rowNumber}:U${rowNumber}`;
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const values = response.data.values?.[0] || [];

  return {
    produto: (values[1] || '').toString().trim(),
    data: formatDateToBr(values[0]),
    meta: {
      latas: Number(values[2] || 0),
      unidades: Number(values[3] || 0),
      kg: Number(values[4] || 0),
    },
  };
}

export async function GET(request: Request, context: { params: Promise<{ rowId: string }> }) {
  try {
    const { rowId } = await context.params;
    const rowNumber = parseInt(rowId);

    if (isNaN(rowNumber) || rowNumber < 2) {
      return NextResponse.json({ error: 'ID de linha inválido' }, { status: 400 });
    }

    const { spreadsheetId, tabName } = PEDIDOS_FERMENTACAO_CONFIG.destinoPedidos;
    const sheets = await getGoogleSheetsClient();
    const range = `${tabName}!C${rowNumber}:AC${rowNumber}`; // Read from C to AC to include observacao
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const values = response.data.values?.[0] || [];
    
    const data = {
      // Pedido original (colunas C, D, E)
      pedidoLatas: Number(values[0] || 0),    // C
      pedidoUnidades: Number(values[1] || 0), // D
      pedidoKg: Number(values[2] || 0),       // E
      // Produção (colunas O, P, Q)
      latas: Number(values[12] || 0),          // O (skips F-N)
      unidades: Number(values[13] || 0),       // P
      kg: Number(values[14] || 0),             // Q
      producaoUpdatedAt: values[15] || '',     // R
      // Foto (colunas S, T, U)
      fermentacaoFotoUrl: values[16] || '',    // S
      fermentacaoFotoId: values[17] || '',     // T
      fermentacaoFotoUploadedAt: values[18] || '', // U
      // Observação
      observacao: (values[26] || '').toString().trim() || undefined, // AC (índice 26 quando começa de C)
    };

    return NextResponse.json({ data, rowId: rowNumber });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ rowId: string }> }) {
  try {
    const { rowId } = await context.params;
    const rowNumber = parseInt(rowId);

    if (isNaN(rowNumber) || rowNumber < 2) {
      return NextResponse.json({ error: 'ID de linha inválido' }, { status: 400 });
    }

    const body = await request.json();
    const { latas, unidades, kg } = body;

    // Validações básicas
    if (latas < 0 || unidades < 0 || kg < 0) {
      return NextResponse.json({ error: 'Quantidades não podem ser negativas' }, { status: 400 });
    }

    const { spreadsheetId, tabName } = PEDIDOS_FERMENTACAO_CONFIG.destinoPedidos;
    const sheets = await getGoogleSheetsClient();
    const rowInfo = await loadFermentacaoRowInfo(sheets, spreadsheetId, tabName, rowNumber);

    const range = `${tabName}!O${rowNumber}:R${rowNumber}`; // Update O-R
    const now = new Date();
    const updatedAtIso = now.toISOString();
    const updatedAtBr = formatDateTimeToBr(now);
    const valoresPlanilha = [
      latas || 0,
      unidades || 0,
      kg || 0,
      updatedAtIso,
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [valoresPlanilha]
      }
    });

    try {
      await whatsAppNotificationService.notifyFermentacaoProduction({
        produto: rowInfo.produto || 'Produto não informado',
        meta: {
          latas: rowInfo.meta.latas,
          unidades: rowInfo.meta.unidades,
          kg: rowInfo.meta.kg,
        },
        produzido: {
          latas: latas || 0,
          unidades: unidades || 0,
          kg: kg || 0,
        },
        data: rowInfo.data,
        atualizadoEm: updatedAtBr,
      });
    } catch {
      // Erro ao enviar notificação WhatsApp - silenciosamente ignorado
    }

    return NextResponse.json({ message: 'Produção de fermentação atualizada com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
