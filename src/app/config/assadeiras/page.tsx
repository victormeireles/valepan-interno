import { Suspense } from 'react';
import { getAssadeiras } from '@/app/actions/assadeiras-actions';
import AssadeirasClient from './AssadeirasClient';

export const dynamic = 'force-dynamic';

export default async function AssadeirasPage() {
  const assadeiras = await getAssadeiras(true);

  return (
    <Suspense fallback={<div className="p-8 text-stone-500">Carregando…</div>}>
      <AssadeirasClient initialAssadeiras={assadeiras} />
    </Suspense>
  );
}
