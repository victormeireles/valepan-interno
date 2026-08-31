'use client';

import { formatInsumoQuantidadeOperacional } from '@/features/insumo-estoque/utils/format-insumo-quantidade-operacional';
import { InsumoPedidoPipelineBadge } from '@/features/insumo-pedido-compra/components/InsumoPedidoPipelineBadge';
import type { InsumoCompraSugestaoLinha } from '@/lib/services/insumo-compra-sugestao-service';

type Props = {
  item: InsumoCompraSugestaoLinha;
  onClick: (item: InsumoCompraSugestaoLinha) => void;
};

export default function InsumoCompraSugestaoPipelineSelo({ item, onClick }: Props) {
  if (!item.pipeline) return null;

  return (
    <InsumoPedidoPipelineBadge
      nome={item.nome}
      quantidadeLabel={formatInsumoQuantidadeOperacional(
        item.pipeline.quantidade,
        item.unidade,
        item.conversao,
        { arredondado: true },
      )}
      resumo={item.pipeline}
      onClick={() => onClick(item)}
    />
  );
}
