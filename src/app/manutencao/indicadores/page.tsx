import { carregarIndicadores } from '@/app/actions/manutencao-indicadores-consulta';
import { IndicadoresPainel } from '@/features/manutencao/components/IndicadoresPainel';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';

export const dynamic = 'force-dynamic';

export default async function IndicadoresPage({
  searchParams,
}: {
  searchParams: Promise<{ inicio?: string; fim?: string }>;
}) {
  await requireInternoModulo('interno_manutencao', 'ler');
  const params = await searchParams;
  const painel = await carregarIndicadores(params.inicio, params.fim);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <IndicadoresPainel painel={painel} />
    </div>
  );
}
