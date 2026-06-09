import { NextResponse } from 'next/server';
import { resolvePedidoSyncWindowForApi } from '@/domain/embalagem/sync-pedido-window';
import { apiKeyAuthService } from '@/lib/services/api-key-auth-service';
import { pedidoEmbalagemService } from '@/lib/services/pedido-embalagem-service';

export const maxDuration = 60;

type SyncParams = {
  from?: string;
  until?: string;
  dryRun: boolean;
};

function isValidDateISO(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

async function parseSyncParams(request: Request): Promise<SyncParams> {
  const url = new URL(request.url);
  let from = url.searchParams.get('from')?.trim() || undefined;
  let until = url.searchParams.get('until')?.trim() || undefined;
  let dryRun =
    url.searchParams.get('dryRun') === 'true' ||
    url.searchParams.get('dry-run') === 'true';

  if (request.method === 'POST') {
    try {
      const body = (await request.json()) as Partial<SyncParams>;
      from = body.from?.trim() || from;
      until = body.until?.trim() || until;
      dryRun = body.dryRun ?? dryRun;
    } catch {
      // body vazio ou inválido: usa query string
    }
  }

  return { from, until, dryRun };
}

function validateWindow(window: { from: string; to: string }) {
  if (!isValidDateISO(window.from) || !isValidDateISO(window.to)) {
    return 'Datas inválidas. Use o formato YYYY-MM-DD em from e until.';
  }
  if (window.from > window.to) {
    return 'from não pode ser posterior a until.';
  }
  return null;
}

async function runSync(request: Request) {
  if (!apiKeyAuthService.validateRequest(request)) {
    return NextResponse.json(
      {
        error:
          'Não autorizado. Forneça uma API key válida no header Authorization ou X-API-Key',
      },
      { status: 401 },
    );
  }

  const params = await parseSyncParams(request);
  const window = resolvePedidoSyncWindowForApi(params);
  const validationError = validateWindow(window);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const result = await pedidoEmbalagemService.reconcileWindow(window, {
    dryRun: params.dryRun,
  });

  return NextResponse.json({
    success: true,
    dryRun: params.dryRun,
    window,
    days: result.days,
    totalUpserted: result.totalUpserted,
    totalDeleted: result.totalDeleted,
    resolveErrors: result.resolveErrors,
    byDate: result.byDate,
  });
}

/**
 * Sincroniza pedidos de embalagem (meta da planilha) para o Supabase.
 *
 * Query/body opcionais:
 * - from, until: YYYY-MM-DD (default: hoje e amanhã, fuso BR)
 * - dryRun: true para simular sem gravar
 *
 * Autenticação: header Authorization (Bearer) ou X-API-Key com API_KEY.
 */
export async function POST(request: Request) {
  try {
    return await runSync(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[API sync/pedidos-embalagem]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** GET para facilitar cron jobs (mesmos parâmetros via query string). */
export async function GET(request: Request) {
  try {
    return await runSync(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[API sync/pedidos-embalagem]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
