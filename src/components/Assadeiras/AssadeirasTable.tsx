'use client';

import type { Assadeira } from '@/app/actions/assadeiras-actions';

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
    : 'hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden';

  return (
    <div className={wrapperClassName}>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            {headers.map(({ key, label, align = 'left' }) => (
              <th
                key={label}
                scope="col"
                className={`px-4 py-3 font-semibold text-gray-600 ${
                  align === 'right' ? 'text-right' : 'text-left'
                }`}
                aria-sort={key ? sortAriaValue(key, sortKey, sortDir) : undefined}
              >
                {key ? (
                  <button
                    type="button"
                    onClick={() => onSort(key)}
                    className={`inline-flex min-h-11 items-center gap-1 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg px-1 ${
                      align === 'right' ? 'ml-auto' : ''
                    }`}
                  >
                    {label}
                    {sortKey === key && (
                      <span className="material-icons text-base" aria-hidden="true">
                        {sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                      </span>
                    )}
                  </button>
                ) : (
                  label
                )}
              </th>
            ))}
            <th scope="col" className="w-10 px-2 py-3">
              <span className="sr-only">Abrir</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              tabIndex={0}
              aria-label={`Editar assadeira ${item.nome}`}
              className={`border-b border-gray-50 hover:bg-gray-50 cursor-pointer focus:outline-none focus-visible:bg-blue-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${
                !item.ativo ? 'opacity-60' : ''
              }`}
              onClick={() => onRowClick(item)}
              onKeyDown={(event) => handleRowKeyDown(event, () => onRowClick(item))}
            >
              <td className="px-4 py-3 font-medium text-gray-900">{item.nome}</td>
              <td className="px-4 py-3 tabular-nums text-gray-900 text-right">
                {item.unidades_por_assadeira ?? '—'}
              </td>
              <td className="px-4 py-3 tabular-nums text-gray-900 text-right">
                {item.quantidade}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                    item.ativo
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <span className="material-icons text-sm" aria-hidden="true">
                    {item.ativo ? 'check_circle' : 'pause_circle'}
                  </span>
                  {item.ativo ? 'Ativa' : 'Inativa'}
                </span>
              </td>
              <td className="px-2 py-3 text-gray-400">
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
