import { Suspense } from 'react';
import { getCategoriasVisibilidadeEmbalagem } from '@/app/actions/categoria-visibilidade-actions';
import CategoriasConfigClient from './CategoriasConfigClient';

export const dynamic = 'force-dynamic';

export default async function CategoriasConfigPage() {
  const categorias = await getCategoriasVisibilidadeEmbalagem();

  return (
    <Suspense fallback={<div className="p-8 text-stone-500">Carregando…</div>}>
      <CategoriasConfigClient initialCategorias={categorias} />
    </Suspense>
  );
}
