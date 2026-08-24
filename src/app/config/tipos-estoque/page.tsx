import { Suspense } from 'react';
import { listReceitasCaixaAtivas, listTiposEstoqueAdmin } from '@/app/actions/tipos-estoque-actions';
import TiposEstoqueClient from './TiposEstoqueClient';

export const dynamic = 'force-dynamic';

export default async function TiposEstoquePage() {
  const [tipos, caixaReceitas] = await Promise.all([
    listTiposEstoqueAdmin(true),
    listReceitasCaixaAtivas(),
  ]);

  return (
    <Suspense fallback={<div className="p-8 text-stone-500">Carregando…</div>}>
      <TiposEstoqueClient initialTipos={tipos} caixaReceitas={caixaReceitas} />
    </Suspense>
  );
}
