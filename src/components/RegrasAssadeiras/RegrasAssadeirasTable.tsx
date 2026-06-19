'use client';

import type { CategoriaAssadeiraRegra } from '@/app/actions/categoria-assadeira-regras-actions';
import ConfigAtivoBadge from '@/components/Config/ConfigAtivoBadge';
import ConfigSortIcon from '@/components/Config/ConfigSortIcon';
import {
  configSortButtonClass,
  configTableBodyCellClass,
  configTableHeadCellClass,
  configTableRowClass,
  formatNumericZero,
} from '@/components/Config/config-table-styles';
import { formatPesoGramas } from '@/components/RegrasAssadeiras/format-peso-gramas';

export type RegraSortKey =
  | 'categoria_nome'
  | 'peso_g'
  | 'assadeira_nome'
  | 'unidades_efetivas'
  | 'ativo';

type Props = {
  items: CategoriaAssadeiraRegra[];
  sortKey: RegraSortKey;
  sortDir: 'asc' | 'desc';
  onSort: (key: RegraSortKey) => void;
  onRowClick: (item: CategoriaAssadeiraRegra) => void;
  embedded?: boolean;
};

function sortAriaValue(key: RegraSortKey, activeKey: RegraSortKey, dir: 'asc' | 'desc') {
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

export default function RegrasAssadeirasTable({
  items,
  sortKey,
  sortDir,
  onSort,
  onRowClick,
  embedded = false,
}: Props) {
  const headers: {
    key: RegraSortKey | null;
    label: string;
    align?: 'left' | 'right';
  }[] = [
    { key: 'categoria_nome', label: 'Categoria' },
    { key: 'peso_g', label: 'Peso' },
    { key: 'assadeira_nome', label: 'Assadeira' },
    { key: 'unidades_efetivas', label: 'Pães efetivos', align: 'right' },
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
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {items.map((item, index) => (
            <tr
              key={item.id}
              tabIndex={0}
              onClick={() => onRowClick(item)}
              onKeyDown={(e) => handleRowKeyDown(e, () => onRowClick(item))}
              className={configTableRowClass(index, !item.ativo)}
            >
              <td className={`${configTableBodyCellClass} font-medium text-stone-900`}>
                {item.categoria_nome}
              </td>
              <td className={`${configTableBodyCellClass} font-mono tabular-nums text-stone-700`}>
                {formatPesoGramas(item.peso_g)}
              </td>
              <td className={`${configTableBodyCellClass} text-stone-700`}>
                {item.assadeira_nome}
              </td>
              <td className={`${configTableBodyCellClass} text-right font-mono tabular-nums text-stone-700`}>
                {item.unidades_efetivas == null
                  ? '—'
                  : formatNumericZero(item.unidades_efetivas)}
              </td>
              <td className={configTableBodyCellClass}>
                <ConfigAtivoBadge
                  ativo={item.ativo}
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
