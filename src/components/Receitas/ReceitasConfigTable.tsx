'use client';

import type { ReceitaWithRelations } from '@/app/actions/receitas-actions';
import ConfigAtivoBadge from '@/components/Config/ConfigAtivoBadge';
import ConfigSortIcon from '@/components/Config/ConfigSortIcon';
import {
  configSortButtonClass,
  configTableBodyCellClass,
  configTableHeadCellClass,
  configTableZebraRowClass,
  formatNumericZero,
} from '@/components/Config/config-table-styles';
import ReceitaConfigOverflowMenu, {
  type ReceitaConfigMenuAction,
} from '@/components/Receitas/ReceitaConfigOverflowMenu';
import {
  countProdutosVinculadosReceita,
  podeRemoverReceita,
} from '@/domain/receitas/receita-delete-eligibility';

export type ReceitaSortKey = 'nome' | 'tipo' | 'ativo';

const TIPO_LABELS: Record<ReceitaWithRelations['tipo'], string> = {
  massa: 'Massa',
  brilho: 'Brilho',
  confeito: 'Confeito',
  antimofo: 'Antimofo',
  embalagem: 'Embalagem',
  caixa: 'Caixa',
};

type Props = {
  items: ReceitaWithRelations[];
  sortKey: ReceitaSortKey;
  sortDir: 'asc' | 'desc';
  onSort: (key: ReceitaSortKey) => void;
  onMenuSelect: (item: ReceitaWithRelations, action: ReceitaConfigMenuAction) => void;
  embedded?: boolean;
};

function isAtiva(receita: ReceitaWithRelations) {
  return receita.ativo !== false;
}

function countIngredientes(receita: ReceitaWithRelations) {
  return receita.receita_ingredientes?.length ?? 0;
}

function countProdutosAtivos(receita: ReceitaWithRelations) {
  return (receita.produto_receitas ?? []).filter((link) => link.ativo).length;
}

export default function ReceitasConfigTable({
  items,
  sortKey,
  sortDir,
  onSort,
  onMenuSelect,
  embedded = false,
}: Props) {
  const sortAriaValue = (key: ReceitaSortKey) => {
    if (key !== sortKey) return 'none' as const;
    return sortDir === 'asc' ? ('ascending' as const) : ('descending' as const);
  };

  const wrapperClassName = embedded
    ? 'hidden md:block overflow-x-auto'
    : 'hidden md:block overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm';

  const headers: {
    key: ReceitaSortKey | null;
    label: string;
    align?: 'left' | 'right';
  }[] = [
    { key: 'nome', label: 'Nome' },
    { key: 'tipo', label: 'Tipo' },
    { key: null, label: 'Ingredientes', align: 'right' },
    { key: null, label: 'Produtos', align: 'right' },
    { key: 'ativo', label: 'Status' },
    { key: null, label: 'Ações', align: 'right' },
  ];

  return (
    <div className={wrapperClassName}>
      <table className="w-full border-collapse text-sm">
        <thead className="border-b border-stone-200 bg-surface-sunken">
          <tr>
            {headers.map(({ key, label, align = 'left' }) => (
              <th
                key={label}
                scope="col"
                className={`${configTableHeadCellClass} ${align === 'right' ? 'text-right' : 'text-left'}`}
                aria-sort={key ? sortAriaValue(key) : undefined}
              >
                {key ? (
                  <button
                    type="button"
                    onClick={() => onSort(key)}
                    className={`${configSortButtonClass} ${align === 'right' ? 'ml-auto' : ''}`}
                  >
                    {label}
                    <ConfigSortIcon active={sortKey === key} dir={sortDir} />
                  </button>
                ) : (
                  <span
                    className={`${configSortButtonClass} ${align === 'right' ? 'ml-auto' : ''}`}
                  >
                    {label}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {items.map((item, index) => {
            const produtosVinculados = countProdutosVinculadosReceita(item.produto_receitas);
            const inactive = !isAtiva(item);

            return (
              <tr
                key={item.id}
                className={`${configTableZebraRowClass(index)}${inactive ? ' opacity-60' : ''}`}
              >
                <td className={`${configTableBodyCellClass} font-medium text-stone-900`}>
                  {item.nome}
                </td>
                <td className={`${configTableBodyCellClass} text-stone-600`}>
                  {TIPO_LABELS[item.tipo]}
                </td>
                <td className={`${configTableBodyCellClass} text-right font-mono tabular-nums text-stone-700`}>
                  {formatNumericZero(countIngredientes(item))}
                </td>
                <td className={`${configTableBodyCellClass} text-right font-mono tabular-nums text-stone-700`}>
                  {formatNumericZero(countProdutosAtivos(item))}
                </td>
                <td className={configTableBodyCellClass}>
                  <ConfigAtivoBadge
                    ativo={isAtiva(item)}
                    ativoLabel="Ativa"
                    inativoLabel="Inativa"
                  />
                </td>
                <td className={`${configTableBodyCellClass} w-10 py-1`}>
                  <div className="flex justify-end">
                    <ReceitaConfigOverflowMenu
                      compact
                      receitaNome={item.nome}
                      podeRemover={podeRemoverReceita(produtosVinculados)}
                      onSelect={(action) => onMenuSelect(item, action)}
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
