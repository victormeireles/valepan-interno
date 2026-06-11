'use client';

import type { CategoriaAssadeiraRegra } from '@/app/actions/categoria-assadeira-regras-actions';
import { formatPesoGramas } from '@/components/RegrasAssadeiras/format-peso-gramas';

type Props = {
  items: CategoriaAssadeiraRegra[];
  onRowClick: (item: CategoriaAssadeiraRegra) => void;
};

export default function RegrasAssadeirasMobileList({ items, onRowClick }: Props) {
  if (items.length === 0) return null;

  return (
    <div className="md:hidden p-3 pt-0 space-y-2 border-t border-gray-100">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onRowClick(item)}
          className={`w-full rounded-2xl border bg-white p-4 shadow-sm text-left transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
            item.ativo ? 'border-gray-200' : 'border-gray-200 opacity-60'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate">{item.categoria_nome}</p>
              <p className="text-sm text-gray-600 mt-0.5 truncate">{item.assadeira_nome}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                <span>
                  <span className="text-gray-500">Peso:</span>{' '}
                  <span className="tabular-nums font-medium text-gray-900">
                    {formatPesoGramas(item.peso_g)}
                  </span>
                </span>
                <span>
                  <span className="text-gray-500">Pães:</span>{' '}
                  <span className="tabular-nums font-medium text-gray-900">
                    {item.unidades_efetivas ?? '—'}
                  </span>
                </span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                  item.ativo
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {item.ativo ? 'Ativa' : 'Inativa'}
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
