'use client';

import type { Insumo } from '@/app/actions/insumos-actions';

export type InsumoSortKey = 'nome' | 'unidade' | 'custo_unitario' | 'ativo';

type Props = {
  items: Insumo[];
  sortKey: InsumoSortKey;
  sortDir: 'asc' | 'desc';
  onSort: (key: InsumoSortKey) => void;
  onRowClick: (item: Insumo) => void;
  embedded?: boolean;
};

function sortAriaValue(key: InsumoSortKey, activeKey: InsumoSortKey, dir: 'asc' | 'desc') {
  if (key !== activeKey) return 'none' as const;
  return dir === 'asc' ? ('ascending' as const) : ('descending' as const);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function unidadeLabel(insumo: Insumo) {
  return insumo.unidades?.nome_resumido || insumo.unidades?.nome || '—';
}

export default function InsumosConfigTable({
  items,
  sortKey,
  sortDir,
  onSort,
  onRowClick,
  embedded = false,
}: Props) {
  const headers: { key: InsumoSortKey; label: string }[] = [
    { key: 'nome', label: 'Nome' },
    { key: 'unidade', label: 'Unidade' },
    { key: 'custo_unitario', label: 'Custo unitário' },
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
            {headers.map(({ key, label }) => (
              <th
                key={key}
                scope="col"
                className="px-4 py-3 font-semibold text-gray-600 text-left"
                aria-sort={sortAriaValue(key, sortKey, sortDir)}
              >
                <button
                  type="button"
                  onClick={() => onSort(key)}
                  className="inline-flex items-center gap-1 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                >
                  {label}
                  {sortKey === key && (
                    <span className="material-icons text-base" aria-hidden="true">
                      {sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                    </span>
                  )}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
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
              className={`border-b border-gray-50 cursor-pointer hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${
                !item.ativo ? 'opacity-60' : ''
              }`}
            >
              <td className="px-4 py-3 font-medium text-gray-900">{item.nome}</td>
              <td className="px-4 py-3 text-gray-600">{unidadeLabel(item)}</td>
              <td className="px-4 py-3 text-gray-900 tabular-nums">
                {formatCurrency(item.custo_unitario)}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                    item.ativo
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {item.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
