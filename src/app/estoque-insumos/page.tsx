import { Suspense } from 'react';
import { getInsumoEstoqueDashboard } from '@/app/actions/insumo-estoque-actions';
import InsumoEstoqueClient from '@/features/insumo-estoque/InsumoEstoqueClient';

export const dynamic = 'force-dynamic';

export default async function InsumoEstoquePage() {
  const data = await getInsumoEstoqueDashboard();

  return (
    <Suspense fallback={<div className="p-8 text-stone-500">Carregando…</div>}>
      <InsumoEstoqueClient initialData={data} />
    </Suspense>
  );
}
