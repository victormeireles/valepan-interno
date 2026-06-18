'use client';

import type { Insumo } from '@/app/actions/insumos-actions';

type Props = {
  items: Insumo[];
  onRowClick: (item: Insumo) => void;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function InsumosConfigMobileList({ items, onRowClick }: Props) {
  if (items.length === 0) return null;

  return (
    <div className="md:hidden p-3 pt-0 space-y-2 border-t border-gray-100">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onRowClick(item)}
          className={`w-full min-h-11 rounded-2xl border bg-white p-4 shadow-sm text-left transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
            item.ativo ? 'border-gray-200' : 'border-gray-200 opacity-60'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate">{item.nome}</p>
              <p className="mt-1 text-sm text-gray-600">
                {item.unidades?.nome_resumido || item.unidades?.nome || '—'}
              </p>
              <p className="mt-1 text-sm font-medium text-gray-900 tabular-nums">
                {formatCurrency(item.custo_unitario)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                  item.ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {item.ativo ? 'Ativo' : 'Inativo'}
              </span>
              <span className="material-icons text-gray-400" aria-hidden="true">
                chevron_right
              </span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
