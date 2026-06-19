'use client';

import type { TipoEstoqueAdmin } from '@/app/actions/tipos-estoque-actions';
import ConfigAtivoBadge from '@/components/Config/ConfigAtivoBadge';
import ConfigSortIcon from '@/components/Config/ConfigSortIcon';
import {
  configSortButtonClass,
  configTableBodyCellClass,
  configTableHeadCellClass,
  configTableRowClass,
} from '@/components/Config/config-table-styles';
import { Badge } from '@/components/ui/Badge';

export type TipoEstoqueSortKey =
  | 'nome'
  | 'possui_etiqueta'
  | 'congelado'
  | 'mostrar_texto_congelado'
  | 'ativo';

type Props = {
  items: TipoEstoqueAdmin[];
  sortKey: TipoEstoqueSortKey;
  sortDir: 'asc' | 'desc';
  onSort: (key: TipoEstoqueSortKey) => void;
  onRowClick: (item: TipoEstoqueAdmin) => void;
  embedded?: boolean;
};

function sortAriaValue(key: TipoEstoqueSortKey, activeKey: TipoEstoqueSortKey, dir: 'asc' | 'desc') {
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

function BooleanBadge({ value, trueLabel, falseLabel }: { value: boolean; trueLabel: string; falseLabel: string }) {
  return (
    <Badge tone={value ? 'accent' : 'outline'}>
      {value ? trueLabel : falseLabel}
    </Badge>
  );
}

export default function TiposEstoqueTable({
  items,
  sortKey,
  sortDir,
  onSort,
  onRowClick,
  embedded = false,
}: Props) {
  const headers: {
    key: TipoEstoqueSortKey;
    label: string;
  }[] = [
    { key: 'nome', label: 'Nome' },
    { key: 'possui_etiqueta', label: 'Etiqueta' },
    { key: 'congelado', label: 'Congelado' },
    { key: 'mostrar_texto_congelado', label: 'Texto congelado' },
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
            {headers.map(({ key, label }) => (
              <th
                key={key}
                scope="col"
                className={`${configTableHeadCellClass} text-left`}
                aria-sort={sortAriaValue(key, sortKey, sortDir)}
              >
                <button
                  type="button"
                  onClick={() => onSort(key)}
                  className={configSortButtonClass}
                >
                  {label}
                  <ConfigSortIcon active={sortKey === key} dir={sortDir} />
                </button>
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
                {item.nome}
              </td>
              <td className={configTableBodyCellClass}>
                <BooleanBadge value={item.possui_etiqueta} trueLabel="Sim" falseLabel="Não" />
              </td>
              <td className={configTableBodyCellClass}>
                <BooleanBadge value={item.congelado} trueLabel="Sim" falseLabel="Não" />
              </td>
              <td className={configTableBodyCellClass}>
                <BooleanBadge
                  value={item.mostrar_texto_congelado}
                  trueLabel="Sim"
                  falseLabel="Não"
                />
              </td>
              <td className={configTableBodyCellClass}>
                <ConfigAtivoBadge ativo={item.ativo} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
