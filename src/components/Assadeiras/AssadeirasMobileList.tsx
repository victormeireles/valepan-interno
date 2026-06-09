'use client';

import type { Assadeira } from '@/app/actions/assadeiras-actions';

type Props = {
  items: Assadeira[];
  onEdit: (item: Assadeira) => void;
  onRowClick: (item: Assadeira) => void;
};

export default function AssadeirasMobileList({ items, onEdit, onRowClick }: Props) {
  return (
    <div className="md:hidden space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className={`rounded-2xl border bg-white p-4 shadow-sm ${
            item.ativo ? 'border-gray-100' : 'border-gray-200 opacity-60'
          }`}
        >
          <button
            type="button"
            onClick={() => onRowClick(item)}
            className="w-full text-left"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-gray-900">{item.nome}</p>
                {item.codigo && (
                  <p className="text-xs text-gray-500 mt-0.5">{item.codigo}</p>
                )}
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium shrink-0 ${
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
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl bg-gray-50 px-3 py-2">
                <p className="text-xs text-gray-500">Pães/assadeira</p>
                <p className="font-semibold tabular-nums text-gray-900">
                  {item.unidades_por_assadeira ?? '—'}
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 px-3 py-2">
                <p className="text-xs text-gray-500">Qtd estoque</p>
                <p className="font-semibold tabular-nums text-gray-900">
                  {item.quantidade}
                </p>
              </div>
            </div>
          </button>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="min-h-11 px-4 inline-flex items-center gap-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <span className="material-icons text-base">edit</span>
              Editar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
