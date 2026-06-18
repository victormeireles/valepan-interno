'use client';

import type { ProdutoConfigResumo } from '@/domain/produtos/produto-config-resumo';
import AssadeiraStatusBadge from '@/components/ProdutosConfig/AssadeiraStatusBadge';
import ProdutoReceitasCountBadge from '@/components/ProdutosConfig/ProdutoReceitasCountBadge';
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
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th
              scope="col"
              className="px-4 py-3 text-left font-semibold text-gray-600"
              aria-sort={sortAriaValue('nome', sortKey, sortDir)}
            >
              <button
                type="button"
                onClick={() => onSort('nome')}
                className="inline-flex min-h-11 items-center gap-1 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg px-1"
              >
                Nome
                <span className="material-icons text-base" aria-hidden="true">
                  unfold_more
                </span>
              </button>
            </th>
            <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-600">
              Assadeiras
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left font-semibold text-gray-600"
              aria-sort={sortAriaValue('receitasVinculadasCount', sortKey, sortDir)}
            >
              <button
                type="button"
                onClick={() => onSort('receitasVinculadasCount')}
                className="inline-flex min-h-11 items-center gap-1 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg px-1"
              >
                Receitas
                <span className="material-icons text-base" aria-hidden="true">
                  unfold_more
                </span>
              </button>
            </th>
            <th scope="col" className="px-4 py-3 text-right font-semibold text-gray-600 w-24">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((produto) => (
            <tr key={produto.id} className="hover:bg-gray-50/80">
              <td className="px-4 py-3 font-medium text-gray-900">{produto.nome}</td>
              <td className="px-4 py-3">
                <AssadeiraStatusBadge produto={produto} />
              </td>
              <td className="px-4 py-3">
                <ProdutoReceitasCountBadge
                  count={produto.receitasVinculadasCount}
                  receitasVinculadas={produto.receitasVinculadas}
                />
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end">
                  <ProdutoConfigOverflowMenu
                    onSelect={(action) => onMenuSelect(produto.id, action)}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
