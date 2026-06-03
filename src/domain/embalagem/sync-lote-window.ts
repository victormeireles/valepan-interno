import { addCalendarDaysISO, getTodayISOInBrazilTimezone } from '@/lib/utils/date-utils';

export type SyncLoteArgs = {
  days: number;
  since?: string;
  dryRun: boolean;
  force: boolean;
};

export function parseSyncLoteArgs(argv: string[]): SyncLoteArgs {
  let days = 7;
  let since: string | undefined;
  let dryRun = false;
  let force = false;

  for (const arg of argv) {
    if (arg.startsWith('--days=')) {
      days = Math.max(1, parseInt(arg.slice(7), 10) || 7);
    } else if (arg.startsWith('--since=')) {
      since = arg.slice(8).trim();
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--force') {
      force = true;
    }
  }

  return { days, since, dryRun, force };
}

export function resolveSinceDate(args: SyncLoteArgs): string {
  if (args.since) return args.since;
  return addCalendarDaysISO(getTodayISOInBrazilTimezone(), -args.days);
}

export function isDataPedidoInWindow(
  dataPedido: string,
  window: { since: string },
): boolean {
  return dataPedido >= window.since;
}
