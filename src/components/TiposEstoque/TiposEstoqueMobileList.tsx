'use client';

import type { TipoEstoqueAdmin } from '@/app/actions/tipos-estoque-actions';
import ConfigAtivoBadge from '@/components/Config/ConfigAtivoBadge';
import { configMobileRowClass } from '@/components/Config/config-table-styles';
import { Badge } from '@/components/ui/Badge';

type Props = {
  items: TipoEstoqueAdmin[];
  onRowClick: (item: TipoEstoqueAdmin) => void;
};

function Flag({ label }: { label: string }) {
  return <Badge tone="accent">{label}</Badge>;
}

export default function TiposEstoqueMobileList({ items, onRowClick }: Props) {
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
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.possui_etiqueta && <Flag label="Etiqueta" />}
              {item.congelado && <Flag label="Congelado" />}
              {item.mostrar_texto_congelado && <Flag label="Texto congelado" />}
              {!item.possui_etiqueta && !item.congelado && !item.mostrar_texto_congelado && (
                <span className="text-xs text-stone-500">Sem flags de etiqueta</span>
              )}
            </div>
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
