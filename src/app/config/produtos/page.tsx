import { Suspense } from 'react';
import {
  getAssadeirasAtivas,
  getProdutosComAssadeiras,
} from '@/app/actions/produto-assadeiras-actions';
import ProdutosConfigClient from './ProdutosConfigClient';

export const dynamic = 'force-dynamic';

export default async function ProdutosConfigPage() {
  const [produtos, assadeirasAtivas] = await Promise.all([
    getProdutosComAssadeiras(),
    getAssadeirasAtivas(),
  ]);

  return (
    <Suspense fallback={<div className="p-8 text-gray-500">Carregando…</div>}>
      <ProdutosConfigClient
        produtos={produtos}
        assadeirasAtivas={assadeirasAtivas}
      />
    </Suspense>
  );
}
