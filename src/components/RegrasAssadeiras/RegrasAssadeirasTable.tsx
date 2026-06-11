'use client';

import type { CategoriaAssadeiraRegra } from '@/app/actions/categoria-assadeira-regras-actions';
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
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item) => (
            <tr
              key={item.id}
              tabIndex={0}
              onClick={() => onRowClick(item)}
              onKeyDown={(e) => handleRowKeyDown(e, () => onRowClick(item))}
              className={`cursor-pointer transition-colors hover:bg-gray-50 focus:outline-none focus-visible:bg-gray-50 ${
                item.ativo ? '' : 'opacity-60'
              }`}
            >
              <td className="px-4 py-3 font-medium text-gray-900">{item.categoria_nome}</td>
              <td className="px-4 py-3 text-gray-700 tabular-nums">
                {formatPesoGramas(item.peso_g)}
              </td>
              <td className="px-4 py-3 text-gray-700">{item.assadeira_nome}</td>
              <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-900">
                {item.unidades_efetivas ?? '—'}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
