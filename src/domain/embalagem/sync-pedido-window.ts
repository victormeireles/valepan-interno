import { addCalendarDaysISO, getTodayISOInBrazilTimezone } from '@/lib/utils/date-utils';

export type PedidoSyncWindow = {
  from: string;
  to: string;
};

export type SyncPedidoArgs = {
  dryRun: boolean;
  from?: string;
  until?: string;
};

export function parseSyncPedidoArgs(argv: string[]): SyncPedidoArgs {
  let dryRun = false;
  let from: string | undefined;
  let until: string | undefined;

  for (const arg of argv) {
    if (arg === '--dry-run') dryRun = true;
    else if (arg.startsWith('--from=')) from = arg.slice(7).trim();
    else if (arg.startsWith('--until=')) until = arg.slice(8).trim();
  }

  return { dryRun, from, until };
}

export function resolvePedidoSyncWindow(
  args: SyncPedidoArgs,
  today: string = getTodayISOInBrazilTimezone(),
): PedidoSyncWindow {
  return {
    from: args.from ?? addCalendarDaysISO(today, -3),
    to: args.until ?? addCalendarDaysISO(today, 3),
  };
}

/** Janela default da API: hoje até amanhã (fuso BR). */
export function resolvePedidoSyncWindowForApi(
  params: Pick<SyncPedidoArgs, 'from' | 'until'>,
  today: string = getTodayISOInBrazilTimezone(),
): PedidoSyncWindow {
  return {
    from: params.from ?? today,
    to: params.until ?? addCalendarDaysISO(today, 1),
  };
}

export function isDataProducaoInWindow(
  dataProducao: string,
  window: PedidoSyncWindow,
): boolean {
  return dataProducao >= window.from && dataProducao <= window.to;
}

export function enumerateDatesInclusive(from: string, to: string): string[] {
  const dates: string[] = [];
  let cur = from;
  while (cur <= to) {
    dates.push(cur);
    cur = addCalendarDaysISO(cur, 1);
  }
  return dates;
}
