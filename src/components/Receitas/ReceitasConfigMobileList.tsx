'use client';

import type { ReceitaWithRelations } from '@/app/actions/receitas-actions';

const TIPO_LABELS: Record<ReceitaWithRelations['tipo'], string> = {
  massa: 'Massa',
  brilho: 'Brilho',
  confeito: 'Confeito',
  antimofo: 'Antimofo',
  embalagem: 'Embalagem',
  caixa: 'Caixa',
};

type Props = {
  items: ReceitaWithRelations[];
  onRowClick: (item: ReceitaWithRelations) => void;
};

export default function ReceitasConfigMobileList({ items, onRowClick }: Props) {
  if (items.length === 0) return null;

  return (
    <div className="md:hidden p-3 pt-0 space-y-2 border-t border-gray-100">
      {items.map((item) => {
        const ativa = item.ativo !== false;
        const ingredientes = item.receita_ingredientes?.length ?? 0;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onRowClick(item)}
            className={`w-full min-h-11 rounded-2xl border bg-white p-4 shadow-sm text-left transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              ativa ? 'border-gray-200' : 'border-gray-200 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {TIPO_LABELS[item.tipo]}
                </p>
                <p className="font-semibold text-gray-900 truncate">{item.nome}</p>
                <p className="mt-1 text-sm text-gray-600">
                  {ingredientes} ingrediente{ingredientes === 1 ? '' : 's'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                    ativa ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {ativa ? 'Ativa' : 'Inativa'}
                </span>
                <span className="material-icons text-gray-400" aria-hidden="true">
                  chevron_right
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
