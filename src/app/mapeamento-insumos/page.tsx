import { Suspense } from 'react';
import { getInsumoMapeamentoPageData } from '@/app/actions/insumo-estoque-actions';
import InsumoMapeamentoClient from '@/features/insumo-estoque/InsumoMapeamentoClient';

export const dynamic = 'force-dynamic';

export default async function InsumoMapeamentoPage() {
  const data = await getInsumoMapeamentoPageData();

  return (
    <Suspense fallback={<div className="p-8 text-stone-500">Carregando…</div>}>
      <InsumoMapeamentoClient initialData={data} />
    </Suspense>
  );
}
