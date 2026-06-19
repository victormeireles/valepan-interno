'use client';

import type { InsumoPendenciaComEmpresa } from '@/domain/types/insumo-estoque-db';
import { Button } from '@/components/ui/Button';
import { configMobileRowClass } from '@/components/Config/config-table-styles';
import {
  formatCurrency,
  formatDate,
  formatInsumoQuantidade,
} from '@/features/insumo-estoque/utils/formatters';

type Props = {
  items: InsumoPendenciaComEmpresa[];
  onVincular: (item: InsumoPendenciaComEmpresa) => void;
  onIgnorar: (item: InsumoPendenciaComEmpresa) => void;
};

export default function InsumoPendenciaMobileList({
  items,
  onVincular,
  onIgnorar,
}: Props) {
  if (items.length === 0) return null;

  return (
    <div className="divide-y divide-stone-100 md:hidden">
      {items.map((item, index) => (
        <div key={item.id} className={`${configMobileRowClass(index)} flex-col items-stretch`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-stone-900">
                NF {item.numero_nf || '—'}
              </p>
              <p className="mt-0.5 text-xs text-stone-500">
                {formatDate(item.data_emissao_nf)} • {item.empresaNome}
              </p>
            </div>
            <p className="shrink-0 font-mono text-sm tabular-nums text-stone-700">
              {formatCurrency(Number(item.valor_total_item))}
            </p>
          </div>

          <div className="mt-2">
            <p className="font-mono text-xs text-stone-500">
              {item.omie_codigo_produto || item.omie_id_produto}
            </p>
            <p className="mt-0.5 text-sm text-stone-800">{item.descricao_produto || '—'}</p>
            <p className="mt-1 font-mono text-sm tabular-nums text-stone-800">
              {formatInsumoQuantidade(Number(item.quantidade_nf), item.unidade_nf ?? undefined)}
            </p>
          </div>

          <div className="mt-3 flex gap-2">
            <Button size="sm" className="flex-1" onClick={() => onVincular(item)}>
              Vincular
            </Button>
            <Button size="sm" variant="ghost" className="flex-1" onClick={() => onIgnorar(item)}>
              Ignorar
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
