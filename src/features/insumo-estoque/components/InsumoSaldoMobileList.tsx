'use client';

import type { InsumoSaldoComDetalhes } from '@/domain/types/insumo-estoque';
import { IconButton } from '@/components/ui/IconButton';
import { configMobileRowClass } from '@/components/Config/config-table-styles';
import {
  formatCurrency,
  formatDateTime,
  formatInsumoQuantidade,
} from '@/features/insumo-estoque/utils/formatters';

type Props = {
  items: InsumoSaldoComDetalhes[];
  onAjustar: (item: InsumoSaldoComDetalhes) => void;
  onHistorico: (item: InsumoSaldoComDetalhes) => void;
};

export default function InsumoSaldoMobileList({
  items,
  onAjustar,
  onHistorico,
}: Props) {
  if (items.length === 0) return null;

  return (
    <div className="divide-y divide-stone-100 md:hidden">
      {items.map((item, index) => (
        <div
          key={item.insumoId}
          className={`${configMobileRowClass(index)} items-center`}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-stone-900">{item.nome}</p>
            <p className="mt-1 font-mono text-sm font-medium tabular-nums text-stone-800">
              {formatInsumoQuantidade(item.quantidade, item.unidadeResumida)}
            </p>
            <p className="mt-0.5 font-mono text-xs tabular-nums text-stone-600">
              {formatCurrency(item.custoUnitario)}
            </p>
            <p className="mt-0.5 text-xs text-stone-500">
              Última entrada: {formatDateTime(item.ultimaEntradaEm)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <IconButton
              icon="history"
              label={`Histórico de ${item.nome}`}
              size="sm"
              onClick={() => onHistorico(item)}
            />
            <IconButton
              icon="tune"
              label={`Ajustar saldo de ${item.nome}`}
              size="sm"
              onClick={() => onAjustar(item)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
