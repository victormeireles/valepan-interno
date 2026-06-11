'use client';

import type { TipoEstoqueAdmin } from '@/app/actions/tipos-estoque-actions';

type Props = {
  items: TipoEstoqueAdmin[];
  onRowClick: (item: TipoEstoqueAdmin) => void;
};

function Flag({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        active ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'
      }`}
    >
      {label}
    </span>
  );
}

export default function TiposEstoqueMobileList({ items, onRowClick }: Props) {
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
              <p className="font-semibold text-gray-900 truncate">{item.nome}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {item.possui_etiqueta && <Flag label="Etiqueta" active />}
                {item.congelado && <Flag label="Congelado" active />}
                {item.mostrar_texto_congelado && <Flag label="Texto congelado" active />}
                {!item.possui_etiqueta && !item.congelado && !item.mostrar_texto_congelado && (
                  <span className="text-xs text-gray-500">Sem flags de etiqueta</span>
                )}
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
