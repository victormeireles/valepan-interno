'use client';

import type { Assadeira } from '@/app/actions/assadeiras-actions';
import ConfigAtivoBadge from '@/components/Config/ConfigAtivoBadge';
import ConfigSortIcon from '@/components/Config/ConfigSortIcon';
import {
  configSortButtonClass,
  configTableBodyCellClass,
  configTableHeadCellClass,
  configTableRowClass,
  formatNumericZero,
} from '@/components/Config/config-table-styles';

export type AssadeiraSortKey =
  | 'nome'
  | 'unidades_por_assadeira'
  | 'quantidade'
  | 'ativo';

type Props = {
  items: Assadeira[];
  sortKey: AssadeiraSortKey;
  sortDir: 'asc' | 'desc';
  onSort: (key: AssadeiraSortKey) => void;
  onRowClick: (item: Assadeira) => void;
  embedded?: boolean;
};

function sortAriaValue(key: AssadeiraSortKey, activeKey: AssadeiraSortKey, dir: 'asc' | 'desc') {
  if (key !== activeKey) return 'none' as const;
  return dir === 'asc' ? ('ascending' as const) : ('descending' as const);
}

function handleRowKeyDown(
  event: React.KeyboardEvent<HTMLTableRowElement>,
  onActivate: () => void,
) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    onActivate();
  }
}

export default function AssadeirasTable({
  items,
  sortKey,
  sortDir,
  onSort,
  onRowClick,
  embedded = false,
}: Props) {
  const headers: {
    key: AssadeiraSortKey | null;
    label: string;
    align?: 'left' | 'right';
  }[] = [
    { key: 'nome', label: 'Nome' },
    { key: 'unidades_por_assadeira', label: 'Pães/assadeira', align: 'right' },
    { key: 'quantidade', label: 'Qtd estoque', align: 'right' },
    { key: 'ativo', label: 'Status' },
  ];

  const wrapperClassName = embedded
    ? 'hidden md:block overflow-x-auto'
    : 'hidden md:block overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm';

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
                aria-sort={key ? sortAriaValue(key, sortKey, sortDir) : undefined}
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
                  <span className={configSortButtonClass}>{label}</span>
                )}
              </th>
            ))}
            <th scope="col" className={`w-10 ${configTableHeadCellClass} px-2`}>
              <span className="sr-only">Abrir</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {items.map((item, index) => (
            <tr
              key={item.id}
              tabIndex={0}
              aria-label={`Editar assadeira ${item.nome}`}
              className={configTableRowClass(index, !item.ativo)}
              onClick={() => onRowClick(item)}
              onKeyDown={(event) => handleRowKeyDown(event, () => onRowClick(item))}
            >
              <td className={`${configTableBodyCellClass} font-medium text-stone-900`}>
                {item.nome}
              </td>
              <td className={`${configTableBodyCellClass} text-right font-mono tabular-nums text-stone-700`}>
                {item.unidades_por_assadeira == null
                  ? '—'
                  : formatNumericZero(item.unidades_por_assadeira)}
              </td>
              <td className={`${configTableBodyCellClass} text-right font-mono tabular-nums text-stone-700`}>
                {formatNumericZero(item.quantidade)}
              </td>
              <td className={configTableBodyCellClass}>
                <ConfigAtivoBadge
                  ativo={item.ativo}
                  ativoLabel="Ativa"
                  inativoLabel="Inativa"
                />
              </td>
              <td className={`${configTableBodyCellClass} px-2 text-stone-400`}>
                <span className="material-icons text-base" aria-hidden="true">
                  chevron_right
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
