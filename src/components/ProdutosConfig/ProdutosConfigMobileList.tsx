'use client';

import type { ProdutoConfigResumo } from '@/domain/produtos/produto-config-resumo';
import { configMobileRowClass } from '@/components/Config/config-table-styles';
import AssadeiraStatusBadge from '@/components/ProdutosConfig/AssadeiraStatusBadge';
import { formatProdutoCount } from '@/components/ProdutosConfig/format-produto-count';
import { buildReceitasTooltip } from '@/components/ProdutosConfig/produto-receitas-tooltip';
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
    <div className="divide-y divide-stone-100 md:hidden">
      {items.map((produto, index) => {
        const receitasTooltip = buildReceitasTooltip(produto.receitasVinculadas);

        return (
          <article key={produto.id} className={configMobileRowClass(index)}>
            <div className="min-w-0 space-y-1.5">
              <h3 className="truncate font-semibold text-stone-900">{produto.nome}</h3>
              <AssadeiraStatusBadge produto={produto} />
              <dl className="flex gap-4 text-sm">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                    Assadeiras
                  </dt>
                  <dd className="mt-0.5 font-mono tabular-nums text-stone-700">
                    {formatProdutoCount(produto.assadeiraResolvidaCount)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                    Receitas
                  </dt>
                  <dd
                    className="mt-0.5 font-mono tabular-nums text-stone-700"
                    title={receitasTooltip}
                  >
                    {formatProdutoCount(produto.receitasVinculadasCount)}
                  </dd>
                </div>
              </dl>
            </div>
            <ProdutoConfigOverflowMenu
              onSelect={(action) => onMenuSelect(produto.id, action)}
            />
          </article>
        );
      })}
    </div>
  );
}
