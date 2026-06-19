'use client';

import type { Assadeira } from '@/app/actions/assadeiras-actions';
import ConfigAtivoBadge from '@/components/Config/ConfigAtivoBadge';
import {
  configMobileRowClass,
  formatNumericZero,
} from '@/components/Config/config-table-styles';

type Props = {
  items: Assadeira[];
  onRowClick: (item: Assadeira) => void;
};

export default function AssadeirasMobileList({ items, onRowClick }: Props) {
  if (items.length === 0) return null;

  return (
    <div className="divide-y divide-stone-100 md:hidden">
      {items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onRowClick(item)}
          className={`${configMobileRowClass(index)} ${!item.ativo ? 'opacity-60' : ''}`}
        >
          <div className="min-w-0">
            <p className="truncate font-semibold text-stone-900">{item.nome}</p>
            <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                  Pães
                </dt>
                <dd className="mt-0.5 font-mono tabular-nums text-stone-700">
                  {item.unidades_por_assadeira == null
                    ? '—'
                    : formatNumericZero(item.unidades_por_assadeira)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                  Estoque
                </dt>
                <dd className="mt-0.5 font-mono tabular-nums text-stone-700">
                  {formatNumericZero(item.quantidade)}
                </dd>
              </div>
            </dl>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ConfigAtivoBadge
              ativo={item.ativo}
              ativoLabel="Ativa"
              inativoLabel="Inativa"
            />
            <span className="material-icons text-stone-400" aria-hidden="true">
              chevron_right
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
