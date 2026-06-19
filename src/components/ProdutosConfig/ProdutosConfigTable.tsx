'use client';

import type { ProdutoConfigResumo } from '@/domain/produtos/produto-config-resumo';
import ConfigSortIcon from '@/components/Config/ConfigSortIcon';
import {
  configSortButtonClass,
  configTableBodyCellClass,
  configTableHeadCellClass,
  configTableZebraRowClass,
} from '@/components/Config/config-table-styles';
import AssadeiraStatusBadge from '@/components/ProdutosConfig/AssadeiraStatusBadge';
import { formatProdutoCount } from '@/components/ProdutosConfig/format-produto-count';
import { buildReceitasTooltip } from '@/components/ProdutosConfig/produto-receitas-tooltip';
import ProdutoConfigOverflowMenu, {
  type ProdutoConfigMenuAction,
} from '@/components/ProdutosConfig/ProdutoConfigOverflowMenu';

export type ProdutoSortKey = 'nome' | 'assadeiraResolvidaCount' | 'receitasVinculadasCount';

type Props = {
  items: ProdutoConfigResumo[];
  sortKey: ProdutoSortKey;
  sortDir: 'asc' | 'desc';
  onSort: (key: ProdutoSortKey) => void;
  onMenuSelect: (produtoId: string, action: ProdutoConfigMenuAction) => void;
};

function sortAriaValue(key: ProdutoSortKey, activeKey: ProdutoSortKey, dir: 'asc' | 'desc') {
  if (key !== activeKey) return 'none' as const;
  return dir === 'asc' ? ('ascending' as const) : ('descending' as const);
}

export default function ProdutosConfigTable({
  items,
  sortKey,
  sortDir,
  onSort,
  onMenuSelect,
}: Props) {
  return (
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full border-collapse text-sm leading-snug">
        <thead className="border-b border-stone-200 bg-surface-sunken">
          <tr>
            <th
              scope="col"
              className={`${configTableHeadCellClass} text-left`}
              aria-sort={sortAriaValue('nome', sortKey, sortDir)}
            >
              <button type="button" onClick={() => onSort('nome')} className={configSortButtonClass}>
                Nome
                <ConfigSortIcon active={sortKey === 'nome'} dir={sortDir} />
              </button>
            </th>
            <th scope="col" className={`${configTableHeadCellClass} text-left`}>
              <span className={configSortButtonClass.replace('hover:text-stone-900', '')}>
                Status
              </span>
            </th>
            <th
              scope="col"
              className={`${configTableHeadCellClass} text-right`}
              aria-sort={sortAriaValue('assadeiraResolvidaCount', sortKey, sortDir)}
            >
              <button
                type="button"
                onClick={() => onSort('assadeiraResolvidaCount')}
                className={`${configSortButtonClass} ml-auto`}
              >
                Assadeiras
                <ConfigSortIcon active={sortKey === 'assadeiraResolvidaCount'} dir={sortDir} />
              </button>
            </th>
            <th
              scope="col"
              className={`${configTableHeadCellClass} text-right`}
              aria-sort={sortAriaValue('receitasVinculadasCount', sortKey, sortDir)}
            >
              <button
                type="button"
                onClick={() => onSort('receitasVinculadasCount')}
                className={`${configSortButtonClass} ml-auto`}
              >
                Receitas
                <ConfigSortIcon active={sortKey === 'receitasVinculadasCount'} dir={sortDir} />
              </button>
            </th>
            <th scope="col" className={`w-10 ${configTableHeadCellClass} text-right`}>
              <span className={configSortButtonClass.replace('hover:text-stone-900', '')}>
                Ações
              </span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {items.map((produto, index) => {
            const receitasTooltip = buildReceitasTooltip(produto.receitasVinculadas);

            return (
              <tr key={produto.id} className={configTableZebraRowClass(index)}>
                <td className={`${configTableBodyCellClass} font-medium text-stone-900`}>
                  {produto.nome}
                </td>
                <td className={configTableBodyCellClass}>
                  <AssadeiraStatusBadge produto={produto} dense />
                </td>
                <td className={`${configTableBodyCellClass} text-right`}>
                  <span
                    className="font-mono tabular-nums text-stone-700"
                    aria-label={
                      produto.assadeiraResolvidaCount === 0
                        ? 'Nenhuma assadeira'
                        : `${produto.assadeiraResolvidaCount} assadeiras`
                    }
                  >
                    {formatProdutoCount(produto.assadeiraResolvidaCount)}
                  </span>
                </td>
                <td className={`${configTableBodyCellClass} text-right`}>
                  <span
                    className="font-mono tabular-nums text-stone-700"
                    title={receitasTooltip}
                    aria-label={
                      receitasTooltip ||
                      (produto.receitasVinculadasCount === 0
                        ? 'Nenhuma receita vinculada'
                        : `${produto.receitasVinculadasCount} receitas`)
                    }
                  >
                    {formatProdutoCount(produto.receitasVinculadasCount)}
                  </span>
                </td>
                <td className={`${configTableBodyCellClass} w-10 py-1`}>
                  <div className="flex justify-end">
                    <ProdutoConfigOverflowMenu
                      compact
                      onSelect={(action) => onMenuSelect(produto.id, action)}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
