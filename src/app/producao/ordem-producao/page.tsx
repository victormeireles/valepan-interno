import {
  getLatasUsoResumoOrdemDiaria,
  getOrdemProducaoDiariaByDate,
  listClientesOrdemProducaoDiaria,
} from '@/app/actions/producao-actions';
import { listTiposCaixaEmbalagemAtivosParaOrdem } from '@/app/actions/tipos-caixa-embalagem-actions';
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
  const [result, tiposCaixaRes, clientesRes] = await Promise.all([
    getOrdemProducaoDiariaByDate(dateIso),
    listTiposCaixaEmbalagemAtivosParaOrdem(),
    listClientesOrdemProducaoDiaria(),
  ]);
  const migrationPendingSkeleton =
    !result.success && isOrdemDiariaSchemaMigrationPendingError(result.error);
  const tiposCaixaOpcoes = tiposCaixaRes.success ? tiposCaixaRes.data : [];
  const clientesOrdemOpcoes = clientesRes.success ? clientesRes.data : [];
  const latasUsoResumo =
    result.success && result.data ? await getLatasUsoResumoOrdemDiaria(result.data.itens) : [];

  return (
    <OrdemProducaoClient
      selectedDateIso={dateIso}
      todayIso={todayIso}
      initialData={result.success ? result.data : null}
      initialError={result.success ? null : result.error}
      migrationPendingSkeleton={migrationPendingSkeleton}
      tiposCaixaOpcoesInicial={tiposCaixaOpcoes}
      clientesOrdemOpcoesInicial={clientesOrdemOpcoes}
      latasUsoResumoInicial={latasUsoResumo}
    />
  );
}
