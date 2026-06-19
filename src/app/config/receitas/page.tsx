import { Suspense } from 'react';
import { getReceitas } from '@/app/actions/receitas-actions';
import ReceitasConfigClient from './ReceitasConfigClient';

export const dynamic = 'force-dynamic';

export default async function ReceitasConfigPage() {
  const receitas = await getReceitas(true);

  return (
    <Suspense fallback={<div className="p-8 text-stone-500">Carregando…</div>}>
      <ReceitasConfigClient initialReceitas={receitas} />
    </Suspense>
  );
}
