import { Suspense } from 'react';
import { getInsumos } from '@/app/actions/insumos-actions';
import InsumosConfigClient from './InsumosConfigClient';

export const dynamic = 'force-dynamic';

export default async function InsumosConfigPage() {
  const insumos = await getInsumos(true);

  return (
    <Suspense fallback={<div className="p-8 text-gray-500">Carregando…</div>}>
      <InsumosConfigClient initialInsumos={insumos} />
    </Suspense>
  );
}
