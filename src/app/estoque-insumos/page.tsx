import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getInsumoSaldosPageData } from '@/app/actions/insumo-estoque-actions';
import InsumoSaldosClient from '@/features/insumo-estoque/InsumoSaldosClient';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function InsumoEstoquePage({ searchParams }: Props) {
  const { tab } = await searchParams;
  if (tab === 'pendencias' || tab === 'vinculos' || tab === 'ignorados') {
    const query = tab === 'pendencias' ? '' : `?tab=${tab}`;
    redirect(`/mapeamento-insumos${query}`);
  }

  const data = await getInsumoSaldosPageData();

  return (
    <Suspense fallback={<div className="p-8 text-stone-500">Carregando…</div>}>
      <InsumoSaldosClient initialData={data} />
    </Suspense>
  );
}
