'use client';

import type { ReceitaWithRelations } from '@/app/actions/receitas-actions';
import ConfigAtivoBadge from '@/components/Config/ConfigAtivoBadge';
import { configMobileRowClass } from '@/components/Config/config-table-styles';

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
    <div className="divide-y divide-stone-100 md:hidden">
      {items.map((item, index) => {
        const ativa = item.ativo !== false;
        const ingredientes = item.receita_ingredientes?.length ?? 0;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onRowClick(item)}
            className={`${configMobileRowClass(index)} ${!ativa ? 'opacity-60' : ''}`}
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                {TIPO_LABELS[item.tipo]}
              </p>
              <p className="truncate font-semibold text-stone-900">{item.nome}</p>
              <p className="mt-1 text-sm text-stone-600">
                {ingredientes === 0 ? (
                  <span className="font-mono tabular-nums text-stone-700">—</span>
                ) : (
                  <>
                    <span className="font-mono tabular-nums text-stone-700">
                      {ingredientes}
                    </span>
                    {ingredientes === 1 ? ' ingrediente' : ' ingredientes'}
                  </>
                )}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ConfigAtivoBadge
                ativo={ativa}
                ativoLabel="Ativa"
                inativoLabel="Inativa"
              />
              <span className="material-icons text-stone-400" aria-hidden="true">
                chevron_right
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
