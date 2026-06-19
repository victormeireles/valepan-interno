'use client';

import type { Insumo } from '@/app/actions/insumos-actions';
import ConfigAtivoBadge from '@/components/Config/ConfigAtivoBadge';
import { configMobileRowClass } from '@/components/Config/config-table-styles';

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
            <p className="mt-1 text-sm text-stone-600">
              {item.unidades?.nome_resumido || item.unidades?.nome || '—'}
            </p>
            <p className="mt-1 font-mono text-sm font-medium tabular-nums text-stone-700">
              {formatCurrency(item.custo_unitario)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ConfigAtivoBadge ativo={item.ativo} />
            <span className="material-icons text-stone-400" aria-hidden="true">
              chevron_right
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
