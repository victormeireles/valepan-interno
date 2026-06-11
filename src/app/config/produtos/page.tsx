import { Suspense } from 'react';
import {
  getAssadeirasAtivas,
  getProdutoAssadeiraLinks,
  getProdutosComAssadeiras,
} from '@/app/actions/produto-assadeiras-actions';
import ProdutosConfigClient from './ProdutosConfigClient';

export const dynamic = 'force-dynamic';

export default async function ProdutosConfigPage() {
  const [produtos, assadeirasAtivas] = await Promise.all([
    getProdutosComAssadeiras(),
    getAssadeirasAtivas(),
  ]);

  const linksEntries = await Promise.all(
    produtos.map(
      async (p) => [p.id, await getProdutoAssadeiraLinks(p.id)] as const,
    ),
  );
  const linksByProdutoId = Object.fromEntries(linksEntries);

  return (
    <Suspense fallback={<div className="p-8 text-gray-500">Carregando…</div>}>
      <ProdutosConfigClient
        produtos={produtos}
        assadeirasAtivas={assadeirasAtivas}
        linksByProdutoId={linksByProdutoId}
      />
    </Suspense>
  );
}
