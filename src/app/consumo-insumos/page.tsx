import { Suspense } from 'react';
import { getInsumoConsumoSemanalPageData } from '@/app/actions/insumo-consumo-actions';
import { ConsumoInsumosLoadingSkeleton } from '@/app/consumo-insumos/ConsumoInsumosLoadingSkeleton';
import InsumoConsumoSemanalClient from '@/features/insumo-estoque/InsumoConsumoSemanalClient';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{
  dataInicio?: string;
  dataFim?: string;
  visualizacao?: string;
}>;

type Props = {
  searchParams: SearchParams;
};

export default function InsumoConsumoPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<ConsumoInsumosLoadingSkeleton />}>
      <InsumoConsumoPageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function InsumoConsumoPageContent({ searchParams }: Props) {
  const { dataInicio, dataFim, visualizacao } = await searchParams;
  const data = await getInsumoConsumoSemanalPageData({
    dataInicio,
    dataFim,
    visualizacao,
  });

  return <InsumoConsumoSemanalClient initialData={data} />;
}
