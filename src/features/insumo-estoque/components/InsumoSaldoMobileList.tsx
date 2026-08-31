'use client';

import type { InsumoPedidoPipelineResumo } from '@/domain/insumos/insumo-pedido-compra-types';
import type { InsumoSaldoComDetalhes } from '@/domain/types/insumo-estoque';
import { IconButton } from '@/components/ui/IconButton';
import { configMobileRowClass } from '@/components/Config/config-table-styles';
import {
  formatCurrency,
  formatDateTime,
} from '@/features/insumo-estoque/utils/formatters';
import InsumoQuantidadeConvertida from '@/features/insumo-estoque/components/InsumoQuantidadeConvertida';
import InsumoSaldoPipelineSelo from '@/features/insumo-estoque/components/InsumoSaldoPipelineSelo';

type Props = {
  items: InsumoSaldoComDetalhes[];
  pipelinePorInsumo: Record<string, InsumoPedidoPipelineResumo>;
  onAbrirPipeline: (insumoId: string) => void;
  onAjustar: (item: InsumoSaldoComDetalhes) => void;
  onHistorico: (item: InsumoSaldoComDetalhes) => void;
};

export default function InsumoSaldoMobileList({
  items,
  pipelinePorInsumo,
  onAbrirPipeline,
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
            <div className="flex items-start gap-2">
              <p className="min-w-0 flex-1 truncate font-semibold text-stone-900">
                {item.nome}
              </p>
              <InsumoSaldoPipelineSelo
                item={item}
                resumo={pipelinePorInsumo[item.insumoId]}
                onClick={onAbrirPipeline}
              />
            </div>
            <div className={`mt-1 text-sm font-medium ${
              item.quantidade < 0 ? 'text-rose-700' : 'text-stone-800'
            }`}>
              <InsumoQuantidadeConvertida
                quantidadeEstoque={item.quantidade}
                unidadeEstoque={item.unidadeResumida}
                conversao={item.conversao}
              />
            </div>
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
