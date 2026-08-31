import { addDaysIso } from '@/domain/insumos/insumo-compra-data-offset';
import type { InsumoPedidoCompraFormPrefill } from '@/features/insumo-pedido-compra/components/InsumoPedidoCompraFormModal';
import type { InsumoCompraSugestaoLinha } from '@/lib/services/insumo-compra-sugestao-service';

export function buildSugestaoPedidoPrefill(
  item: InsumoCompraSugestaoLinha,
  dataReferencia: string,
): InsumoPedidoCompraFormPrefill {
  const quantidade = item.quantidadeSugerida;
  return {
    fornecedorNome: item.distribuidorPreferencial ?? '',
    dataChegadaPrevista:
      item.leadTimeDias > 0 ? addDaysIso(dataReferencia, item.leadTimeDias) : '',
    itens: [
      {
        insumoId: item.insumoId,
        quantidade: quantidade != null && quantidade > 0 ? quantidade : 0,
      },
    ],
  };
}
