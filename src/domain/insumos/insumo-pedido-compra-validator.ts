import type { ValidarPedidoCompraInput } from './insumo-pedido-compra-types';

export class InsumoPedidoCompraValidator {
  validar(input: ValidarPedidoCompraInput): string | null {
    if (input.fornecedorNome.trim().length === 0) {
      return 'Informe o fornecedor.';
    }
    if (input.dataChegadaPrevista.trim().length === 0) {
      return 'Informe a data de chegada.';
    }
    if (input.itens.length === 0) {
      return 'Inclua pelo menos um insumo.';
    }

    const vistos = new Set<string>();
    for (const item of input.itens) {
      if (item.quantidade <= 0) {
        return 'Quantidade deve ser maior que zero.';
      }
      if (vistos.has(item.insumoId)) {
        return 'O mesmo insumo não pode aparecer duas vezes.';
      }
      vistos.add(item.insumoId);
    }

    return null;
  }
}

export const insumoPedidoCompraValidator = new InsumoPedidoCompraValidator();
