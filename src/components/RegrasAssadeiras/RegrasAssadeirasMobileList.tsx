'use client';

import type { CategoriaAssadeiraRegra } from '@/app/actions/categoria-assadeira-regras-actions';
import ConfigAtivoBadge from '@/components/Config/ConfigAtivoBadge';
import {
  configMobileRowClass,
  formatNumericZero,
} from '@/components/Config/config-table-styles';
import { formatPesoGramas } from '@/components/RegrasAssadeiras/format-peso-gramas';

type Props = {
  items: CategoriaAssadeiraRegra[];
  onRowClick: (item: CategoriaAssadeiraRegra) => void;
};

export default function RegrasAssadeirasMobileList({ items, onRowClick }: Props) {
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
            <p className="truncate font-semibold text-stone-900">{item.categoria_nome}</p>
            <p className="mt-0.5 truncate text-sm text-stone-600">{item.assadeira_nome}</p>
            <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                  Peso
                </dt>
                <dd className="mt-0.5 font-mono tabular-nums text-stone-700">
                  {formatPesoGramas(item.peso_g)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                  Pães
                </dt>
                <dd className="mt-0.5 font-mono tabular-nums text-stone-700">
                  {item.unidades_efetivas == null
                    ? '—'
                    : formatNumericZero(item.unidades_efetivas)}
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
