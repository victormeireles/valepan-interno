import { Suspense } from 'react';
import { getInsumoMapeamentoPageData } from '@/app/actions/insumo-estoque-actions';
import InsumoMapeamentoClient from '@/features/insumo-estoque/InsumoMapeamentoClient';

export const dynamic = 'force-dynamic';

function InsumoMapeamentoPageFallback() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 p-4 sm:p-6">
      <div className="h-1 w-full animate-pulse rounded bg-amber-200" aria-hidden />
      <p className="text-sm text-stone-500" role="status" aria-live="polite">
        Carregando mapeamento…
      </p>
      <div className="h-10 max-w-md animate-pulse rounded-xl bg-stone-200" />
      <div className="h-64 animate-pulse rounded-2xl border border-stone-200 bg-white" />
    </div>
  );
}

export default async function InsumoMapeamentoPage() {
  const data = await getInsumoMapeamentoPageData();

  return (
    <Suspense fallback={<InsumoMapeamentoPageFallback />}>
      <InsumoMapeamentoClient initialData={data} />
    </Suspense>
  );
}
