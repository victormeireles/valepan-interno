'use client';

import type { ProdutoConfigResumo } from '@/domain/produtos/produto-config-resumo';
import AssadeiraStatusBadge from '@/components/ProdutosConfig/AssadeiraStatusBadge';
import ProdutoReceitasCountBadge from '@/components/ProdutosConfig/ProdutoReceitasCountBadge';
import ProdutoConfigOverflowMenu, {
  type ProdutoConfigMenuAction,
} from '@/components/ProdutosConfig/ProdutoConfigOverflowMenu';

type Props = {
  items: ProdutoConfigResumo[];
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
            <div className="flex flex-wrap gap-2">
              <AssadeiraStatusBadge produto={produto} />
              <ProdutoReceitasCountBadge
                count={produto.receitasVinculadasCount}
                receitasVinculadas={produto.receitasVinculadas}
              />
            </div>
          </div>
          <ProdutoConfigOverflowMenu
            onSelect={(action) => onMenuSelect(produto.id, action)}
          />
        </article>
      ))}
    </div>
  );
}
