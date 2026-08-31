import type { InsumoPedidoCompraListItem } from '@/data/insumos/InsumoPedidoCompraRepository';
import type { InsumoPedidoCompraItemInput } from '@/domain/insumos/insumo-pedido-compra-types';
import type { SalvarInsumoPedidoCompraInput } from '@/lib/services/insumo-pedido-compra-manager';
import type { InsumoPedidoFormLinha } from './InsumoPedidoCompraFormLinhas';

export type InsumoPedidoCompraFormPrefill = {
  fornecedorNome: string;
  dataChegadaPrevista: string;
  itens: Array<{ insumoId: string; quantidade: number }>;
};

export const ENCERRAR_PEDIDO_CONFIRM =
  'O saldo físico só aumenta quando a NF do Omie entrar. Encerrar o pedido?';

export function cancelarPedidoConfirm(numero: number, fornecedor: string): string {
  return `Cancelar o Pedido ${numero} · ${fornecedor}?`;
}

export function linhasFromPedido(
  pedido: InsumoPedidoCompraListItem | null,
): InsumoPedidoFormLinha[] {
  if (!pedido || pedido.itens.length === 0) {
    return [{ key: crypto.randomUUID(), insumoId: '', quantidade: '' }];
  }
  return pedido.itens.map((item) => ({
    key: item.id,
    insumoId: item.insumo_id,
    quantidade: String(item.quantidade),
  }));
}

export function linhasFromPrefill(
  prefill: InsumoPedidoCompraFormPrefill,
): InsumoPedidoFormLinha[] {
  if (prefill.itens.length === 0) {
    return [{ key: crypto.randomUUID(), insumoId: '', quantidade: '' }];
  }
  return prefill.itens.map((item) => ({
    key: crypto.randomUUID(),
    insumoId: item.insumoId,
    quantidade: item.quantidade > 0 ? String(item.quantidade) : '',
  }));
}

export function buildSaveInput(
  pedido: InsumoPedidoCompraListItem | null,
  fornecedorNome: string,
  dataChegada: string,
  observacao: string,
  linhas: InsumoPedidoFormLinha[],
): SalvarInsumoPedidoCompraInput {
  return {
    id: pedido?.id,
    fornecedorNome,
    dataChegadaPrevista: dataChegada,
    observacao: observacao.trim() ? observacao.trim() : null,
    itens: parseItens(linhas),
  };
}

export function parseItens(linhas: InsumoPedidoFormLinha[]): InsumoPedidoCompraItemInput[] {
  return linhas
    .filter((linha) => linha.insumoId)
    .map((linha) => {
      const quantidade = Number(linha.quantidade.replace(',', '.'));
      return {
        insumoId: linha.insumoId,
        quantidade: Number.isFinite(quantidade) ? quantidade : 0,
      };
    });
}

export function messageFromUnknown(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}
