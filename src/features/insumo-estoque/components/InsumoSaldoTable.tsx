'use client';

import type { InsumoPedidoPipelineResumo } from '@/domain/insumos/insumo-pedido-compra-types';
import type { InsumoSaldoComDetalhes } from '@/domain/types/insumo-estoque';
import { IconButton } from '@/components/ui/IconButton';
import {
  configTableBodyCellClass,
  configTableHeadCellClass,
} from '@/components/Config/config-table-styles';
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
  embedded?: boolean;
};

export default function InsumoSaldoTable({
  items,
  pipelinePorInsumo,
  onAbrirPipeline,
  onAjustar,
  onHistorico,
  embedded = false,
}: Props) {
  const wrapperClassName = embedded
    ? 'hidden md:block overflow-x-auto'
    : 'hidden md:block overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm';

  return (
    <div className={wrapperClassName}>
      <table className="w-full border-collapse text-sm">
        <thead className="border-b border-stone-200 bg-surface-sunken">
          <tr>
            <th scope="col" className={`${configTableHeadCellClass} text-left`}>
              <span className="uppercase tracking-wide text-[11px] font-semibold text-stone-500">
                Insumo
              </span>
            </th>
            <th scope="col" className={`${configTableHeadCellClass} text-right`}>
              <span className="uppercase tracking-wide text-[11px] font-semibold text-stone-500">
                Saldo
              </span>
            </th>
            <th scope="col" className={`${configTableHeadCellClass} text-right`}>
              <span className="uppercase tracking-wide text-[11px] font-semibold text-stone-500">
                Custo unitário
              </span>
            </th>
            <th scope="col" className={`${configTableHeadCellClass} text-left`}>
              <span className="uppercase tracking-wide text-[11px] font-semibold text-stone-500">
                Última entrada
              </span>
            </th>
            <th scope="col" className={`${configTableHeadCellClass} text-right`}>
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {items.map((item, index) => (
            <tr
              key={item.insumoId}
              className={[
                index % 2 === 1 ? 'bg-stone-50/60' : 'bg-white',
                'transition-colors hover:bg-amber-50/40',
              ].join(' ')}
            >
              <td className={`${configTableBodyCellClass} font-medium text-stone-900`}>
                <div className="flex items-start gap-2">
                  <span className="min-w-0 flex-1">{item.nome}</span>
                  <InsumoSaldoPipelineSelo
                    item={item}
                    resumo={pipelinePorInsumo[item.insumoId]}
                    onClick={onAbrirPipeline}
                  />
                </div>
              </td>
              <td
                className={`${configTableBodyCellClass} text-right ${
                  item.quantidade < 0 ? 'text-rose-700' : 'text-stone-800'
                }`}
              >
                <InsumoQuantidadeConvertida
                  quantidadeEstoque={item.quantidade}
                  unidadeEstoque={item.unidadeResumida}
                  conversao={item.conversao}
                  className="inline-block text-right"
                  secundariaClassName="mt-0.5 font-mono text-xs tabular-nums text-stone-500"
                />
              </td>
              <td
                className={`${configTableBodyCellClass} text-right font-mono tabular-nums text-stone-700`}
              >
                {formatCurrency(item.custoUnitario)}
              </td>
              <td className={`${configTableBodyCellClass} text-stone-600`}>
                {formatDateTime(item.ultimaEntradaEm)}
              </td>
              <td className={`${configTableBodyCellClass} text-right`}>
                <div className="inline-flex items-center gap-1">
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
