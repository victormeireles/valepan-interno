'use client';

import type { TipoEstoqueAdmin } from '@/app/actions/tipos-estoque-actions';

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
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
        value ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'
      }`}
    >
      {value ? trueLabel : falseLabel}
    </span>
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
                  className="inline-flex min-h-11 items-center gap-1 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg px-1"
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
              <td className="px-4 py-3 font-medium text-gray-900">{item.nome}</td>
              <td className="px-4 py-3">
                <BooleanBadge value={item.possui_etiqueta} trueLabel="Sim" falseLabel="Não" />
              </td>
              <td className="px-4 py-3">
                <BooleanBadge value={item.congelado} trueLabel="Sim" falseLabel="Não" />
              </td>
              <td className="px-4 py-3">
                <BooleanBadge
                  value={item.mostrar_texto_congelado}
                  trueLabel="Sim"
                  falseLabel="Não"
                />
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
