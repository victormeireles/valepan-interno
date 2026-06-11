import { Suspense } from 'react';
import { listTiposEstoqueAdmin } from '@/app/actions/tipos-estoque-actions';
import TiposEstoqueClient from './TiposEstoqueClient';

export const dynamic = 'force-dynamic';

export default async function TiposEstoquePage() {
  const tipos = await listTiposEstoqueAdmin(true);

  return (
    <Suspense fallback={<div className="p-8 text-gray-500">Carregando…</div>}>
      <TiposEstoqueClient initialTipos={tipos} />
    </Suspense>
  );
}
