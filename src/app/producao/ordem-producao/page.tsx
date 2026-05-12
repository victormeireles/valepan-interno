import { getOrdemProducaoDiariaByDate } from '@/app/actions/producao-actions';
import { isOrdemDiariaSchemaMigrationPendingError } from '@/lib/production/ordem-producao-rules';
import { parseFilaDataQuery } from '@/lib/production/production-station-routes';
import { getTodayISOInBrazilTimezone } from '@/lib/utils/date-utils';
import OrdemProducaoClient from './OrdemProducaoClient';

export const dynamic = 'force-dynamic';

interface OrdemProducaoPageProps {
  searchParams: Promise<{ data?: string }>;
}

export default async function OrdemProducaoPage({ searchParams }: OrdemProducaoPageProps) {
  const params = await searchParams;
  const parsed = parseFilaDataQuery(params?.data ?? null);
  const todayIso = getTodayISOInBrazilTimezone();
  const dateIso = parsed ?? todayIso;
  const result = await getOrdemProducaoDiariaByDate(dateIso);
  const migrationPendingSkeleton =
    !result.success && isOrdemDiariaSchemaMigrationPendingError(result.error);

  return (
    <OrdemProducaoClient
      selectedDateIso={dateIso}
      todayIso={todayIso}
      initialData={result.success ? result.data : null}
      initialError={result.success ? null : result.error}
      migrationPendingSkeleton={migrationPendingSkeleton}
    />
  );
}
