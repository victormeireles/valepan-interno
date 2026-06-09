'use client';

import type { Assadeira } from '@/app/actions/assadeiras-actions';

export type AssadeiraSortKey =
  | 'nome'
  | 'codigo'
  | 'unidades_por_assadeira'
  | 'quantidade'
  | 'ativo';

type Props = {
  items: Assadeira[];
  sortKey: AssadeiraSortKey;
  sortDir: 'asc' | 'desc';
  onSort: (key: AssadeiraSortKey) => void;
  onEdit: (item: Assadeira) => void;
  onRowClick: (item: Assadeira) => void;
};

function sortAriaValue(key: AssadeiraSortKey, activeKey: AssadeiraSortKey, dir: 'asc' | 'desc') {
  if (key !== activeKey) return 'none' as const;
  return dir === 'asc' ? ('ascending' as const) : ('descending' as const);
}

export default function AssadeirasTable({
  items,
  sortKey,
  sortDir,
  onSort,
  onEdit,
  onRowClick,
}: Props) {
  const headers: { key: AssadeiraSortKey | null; label: string }[] = [
    { key: 'nome', label: 'Nome' },
    { key: 'codigo', label: 'Código' },
    { key: 'unidades_por_assadeira', label: 'Pães/assadeira' },
    { key: 'quantidade', label: 'Qtd estoque' },
    { key: 'ativo', label: 'Status' },
    { key: null, label: 'Ações' },
  ];

  return (
    <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            {headers.map(({ key, label }) => (
              <th
                key={label}
                className="text-left px-4 py-3 font-semibold text-gray-600"
                aria-sort={key ? sortAriaValue(key, sortKey, sortDir) : undefined}
              >
                {key ? (
                  <button
                    type="button"
                    onClick={() => onSort(key)}
                    className="inline-flex min-h-11 items-center gap-1 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg px-1"
                  >
                    {label}
                    {sortKey === key && (
                      <span className="material-icons text-base">
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
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className={`border-b border-gray-50 hover:bg-gray-50 cursor-pointer ${
                !item.ativo ? 'opacity-60' : ''
              }`}
              onClick={() => onRowClick(item)}
            >
              <td className="px-4 py-3 font-medium text-gray-900">{item.nome}</td>
              <td className="px-4 py-3 text-gray-600">{item.codigo || '—'}</td>
              <td className="px-4 py-3 tabular-nums text-gray-900">
                {item.unidades_por_assadeira ?? '—'}
              </td>
              <td className="px-4 py-3 tabular-nums text-gray-900">{item.quantidade}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                    item.ativo
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <span className="material-icons text-sm">
                    {item.ativo ? 'check_circle' : 'pause_circle'}
                  </span>
                  {item.ativo ? 'Ativa' : 'Inativa'}
                </span>
              </td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(item);
                  }}
                  className="min-h-11 px-3 inline-flex items-center gap-1 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  <span className="material-icons text-base">edit</span>
                  Editar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
