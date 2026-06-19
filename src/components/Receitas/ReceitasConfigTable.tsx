'use client';

import type { ReceitaWithRelations } from '@/app/actions/receitas-actions';
import ConfigAtivoBadge from '@/components/Config/ConfigAtivoBadge';
import ConfigSortIcon from '@/components/Config/ConfigSortIcon';
import {
  configSortButtonClass,
  configTableBodyCellClass,
  configTableHeadCellClass,
  configTableRowClass,
  formatNumericZero,
} from '@/components/Config/config-table-styles';

export type ReceitaSortKey = 'nome' | 'tipo' | 'codigo' | 'ativo';

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
  onRowClick: (item: ReceitaWithRelations) => void;
  embedded?: boolean;
};

function isAtiva(receita: ReceitaWithRelations) {
  return receita.ativo !== false;
}

function countIngredientes(receita: ReceitaWithRelations) {
  return receita.receita_ingredientes?.length ?? 0;
}

function countProdutos(receita: ReceitaWithRelations) {
  return (receita.produto_receitas ?? []).filter((link) => link.ativo).length;
}

export default function ReceitasConfigTable({
  items,
  sortKey,
  sortDir,
  onSort,
  onRowClick,
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
    { key: 'codigo', label: 'Código' },
    { key: null, label: 'Ingredientes', align: 'right' },
    { key: null, label: 'Produtos', align: 'right' },
    { key: 'ativo', label: 'Status' },
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
          {items.map((item, index) => (
            <tr
              key={item.id}
              tabIndex={0}
              onClick={() => onRowClick(item)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onRowClick(item);
                }
              }}
              className={configTableRowClass(index, !isAtiva(item))}
            >
              <td className={`${configTableBodyCellClass} font-medium text-stone-900`}>
                {item.nome}
              </td>
              <td className={`${configTableBodyCellClass} text-stone-600`}>
                {TIPO_LABELS[item.tipo]}
              </td>
              <td className={`${configTableBodyCellClass} font-mono text-xs text-stone-500`}>
                {item.codigo || '—'}
              </td>
              <td className={`${configTableBodyCellClass} text-right font-mono tabular-nums text-stone-700`}>
                {formatNumericZero(countIngredientes(item))}
              </td>
              <td className={`${configTableBodyCellClass} text-right font-mono tabular-nums text-stone-700`}>
                {formatNumericZero(countProdutos(item))}
              </td>
              <td className={configTableBodyCellClass}>
                <ConfigAtivoBadge
                  ativo={isAtiva(item)}
                  ativoLabel="Ativa"
                  inativoLabel="Inativa"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
