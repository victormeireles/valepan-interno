'use client';

import type { InsumoPedidoPipelineResumo } from '@/domain/insumos/insumo-pedido-compra-types';
import type { InsumoSaldoComDetalhes } from '@/domain/types/insumo-estoque';
import { formatInsumoQuantidadeOperacional } from '@/features/insumo-estoque/utils/format-insumo-quantidade-operacional';
import { InsumoPedidoPipelineBadge } from '@/features/insumo-pedido-compra/components/InsumoPedidoPipelineBadge';

type Props = {
  item: InsumoSaldoComDetalhes;
  resumo: InsumoPedidoPipelineResumo | undefined;
  onClick: (insumoId: string) => void;
};

export default function InsumoSaldoPipelineSelo({ item, resumo, onClick }: Props) {
  if (!resumo) return null;

  return (
    <InsumoPedidoPipelineBadge
      nome={item.nome}
      quantidadeLabel={formatInsumoQuantidadeOperacional(
        resumo.quantidade,
        item.unidadeResumida,
        item.conversao,
        { arredondado: true },
      )}
      resumo={resumo}
      onClick={() => onClick(item.insumoId)}
      className="shrink-0"
    />
  );
}
