'use client';

import { IconButton } from '@/components/ui/IconButton';
import type { InsumoCompraSugestaoLinha } from '@/lib/services/insumo-compra-sugestao-service';

type Props = {
  item: InsumoCompraSugestaoLinha;
  onClick: (item: InsumoCompraSugestaoLinha) => void;
};

export default function InsumoCompraSugestaoRegistrarPedidoButton({ item, onClick }: Props) {
  return (
    <IconButton
      icon="add_shopping_cart"
      label={`Registrar pedido de ${item.nome}`}
      size="lg"
      onClick={() => onClick(item)}
    />
  );
}
