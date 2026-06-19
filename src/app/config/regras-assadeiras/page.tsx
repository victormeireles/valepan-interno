import { Suspense } from 'react';
import { getAssadeiras } from '@/app/actions/assadeiras-actions';
import {
  getCategoriaAssadeiraRegras,
  getCategoriasAtivas,
} from '@/app/actions/categoria-assadeira-regras-actions';
import RegrasAssadeirasClient from './RegrasAssadeirasClient';

export const dynamic = 'force-dynamic';

export default async function RegrasAssadeirasPage() {
  const [regras, categorias, assadeiras] = await Promise.all([
    getCategoriaAssadeiraRegras(true),
    getCategoriasAtivas(),
    getAssadeiras(false),
  ]);

  return (
    <Suspense fallback={<div className="p-8 text-stone-500">Carregando…</div>}>
      <RegrasAssadeirasClient
        initialRegras={regras}
        categorias={categorias}
        assadeirasAtivas={assadeiras}
      />
    </Suspense>
  );
}
