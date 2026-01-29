import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getGoogleSheetsClient } from '@/lib/googleSheets';
import { PEDIDOS_FORNO_CONFIG } from '@/config/forno';
import { whatsAppNotificationService } from '@/lib/services/whatsapp-notification-service';

type FornoMeta = {
  latas: number;
  unidades: number;
  kg: number;
};

type FornoRowInfo = {
  produto: string;
  data?: string;
  meta: FornoMeta;
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

async function loadFornoRowInfo(
  sheets: Awaited<ReturnType<typeof getGoogleSheetsClient>>,
  spreadsheetId: string,
  tabName: string,
  rowNumber: number,
): Promise<FornoRowInfo> {
  const range = `${tabName}!A${rowNumber}:N${rowNumber}`;
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

export async function GET(
  request: Request,
  context: { params: Promise<{ rowId: string }> }
) {
  try {
    const { rowId } = await context.params;
    const rowNumber = parseInt(rowId);
    if (isNaN(rowNumber) || rowNumber < 2) {
      return NextResponse.json({ error: 'ID de linha inválido' }, { status: 400 });
    }

    const { spreadsheetId, tabName } = PEDIDOS_FORNO_CONFIG.destinoPedidos;
    const sheets = await getGoogleSheetsClient();
    // C-E (pedido), H-K (produção + updated_at), L-N (foto), AC (observação)
    const range = `${tabName}!C${rowNumber}:AC${rowNumber}`;
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const values = response.data.values?.[0] || [];

    const data = {
      // Pedido
      pedidoLatas: Number(values[0] || 0),     // C
      pedidoUnidades: Number(values[1] || 0),  // D
      pedidoKg: Number(values[2] || 0),        // E
      // Produção
      latas: Number(values[5] || 0),           // H (produção latas)
      unidades: Number(values[6] || 0),        // I (produção unidades)
      kg: Number(values[7] || 0),              // J (produção kg)
      producaoUpdatedAt: values[8] || '',      // K
      // Foto
      fornoFotoUrl: values[9] || '',           // L
      fornoFotoId: values[10] || '',           // M
      fornoFotoUploadedAt: values[11] || '',   // N
      // Observação
      observacao: (values[26] || '').toString().trim() || undefined, // AC (índice 26 quando começa de C)
    };

    return NextResponse.json({ data, rowId: rowNumber });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
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
    const { latas, unidades, kg } = body;
    if (latas < 0 || unidades < 0 || kg < 0) {
      return NextResponse.json({ error: 'Valores não podem ser negativos' }, { status: 400 });
    }

    const { spreadsheetId, tabName } = PEDIDOS_FORNO_CONFIG.destinoPedidos;
    const sheets = await getGoogleSheetsClient();
    const rowInfo = await loadFornoRowInfo(sheets, spreadsheetId, tabName, rowNumber);

    const range = `${tabName}!H${rowNumber}:K${rowNumber}`;
    const now = new Date();
    const updatedAtIso = now.toISOString();
    const updatedAtBr = formatDateTimeToBr(now);
    const valoresPlanilha = [
      latas || 0,                 // H
      unidades || 0,              // I
      kg || 0,                    // J
      updatedAtIso,               // K
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [valoresPlanilha] }
    });

    try {
      await whatsAppNotificationService.notifyFornoProduction({
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

    revalidatePath('/api/painel/forno');

    return NextResponse.json({ message: 'Produção de forno atualizada com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


