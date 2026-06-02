import { getTodayISOInBrazilTimezone } from '@/lib/utils/date-utils';
import { getPerdasProducaoPorDia } from '@/app/actions/producao-perdas-actions';
import PerdasDiariasClient from './PerdasDiariasClient';

export const dynamic = 'force-dynamic';

export default async function PerdasDiariasPage() {
  const hoje = getTodayISOInBrazilTimezone();
  const inicial = await getPerdasProducaoPorDia(hoje);
  return <PerdasDiariasClient dadosInicial={inicial} />;
}
