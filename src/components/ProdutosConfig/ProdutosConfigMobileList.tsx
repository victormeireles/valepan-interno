'use client';

import type { ProdutoComAssadeirasResumo } from '@/app/actions/produto-assadeiras-actions';
import AssadeiraStatusBadge from '@/components/ProdutosConfig/AssadeiraStatusBadge';
import ProdutoConfigOverflowMenu, {
  type ProdutoConfigMenuAction,
} from '@/components/ProdutosConfig/ProdutoConfigOverflowMenu';

type Props = {
  items: ProdutoComAssadeirasResumo[];
  onMenuSelect: (produtoId: string, action: ProdutoConfigMenuAction) => void;
};

export default function ProdutosConfigMobileList({ items, onMenuSelect }: Props) {
  if (items.length === 0) return null;

  return (
    <div className="md:hidden divide-y divide-gray-100">
      {items.map((produto) => (
        <article key={produto.id} className="p-4 flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <h3 className="font-semibold text-gray-900 truncate">{produto.nome}</h3>
            <AssadeiraStatusBadge produto={produto} />
          </div>
          <ProdutoConfigOverflowMenu
            onSelect={(action) => onMenuSelect(produto.id, action)}
          />
        </article>
      ))}
    </div>
  );
}
