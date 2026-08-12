import { Suspense } from 'react';

import { listarRegrasParaConfig } from '@/app/actions/insumo-compra-regra-actions';
import RegrasCompraInsumosClient from './RegrasCompraInsumosClient';

export const dynamic = 'force-dynamic';

export default async function RegrasCompraInsumosPage() {
  const regras = await listarRegrasParaConfig();

  return (
    <Suspense fallback={<div className="p-8 text-stone-500">Carregando…</div>}>
      <RegrasCompraInsumosClient initialRegras={regras} />
    </Suspense>
  );
}
