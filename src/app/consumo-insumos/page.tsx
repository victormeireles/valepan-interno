import { Suspense } from 'react';
import { getInsumoConsumoSemanalPageData } from '@/app/actions/insumo-estoque-actions';
import InsumoConsumoSemanalClient from '@/features/insumo-estoque/InsumoConsumoSemanalClient';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<{
    dataInicio?: string;
    dataFim?: string;
    visualizacao?: string;
  }>;
};

export default async function InsumoConsumoPage({ searchParams }: Props) {
  const { dataInicio, dataFim, visualizacao } = await searchParams;
  const data = await getInsumoConsumoSemanalPageData({
    dataInicio,
    dataFim,
    visualizacao,
  });

  return (
    <Suspense fallback={<div className="p-8 text-stone-500">Carregando...</div>}>
      <InsumoConsumoSemanalClient initialData={data} />
    </Suspense>
  );
}
