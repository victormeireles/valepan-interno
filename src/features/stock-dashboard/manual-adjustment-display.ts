import type { Quantidade } from '@/domain/types/inventario';
import type { EstoqueMovimentoRecord } from '@/domain/types/estoque-db';
import { calcularSaldoAntes } from '@/domain/estoque/quantidade-calculo';

export type ManualAdjustmentDisplay = {
  id: string;
  createdAt: string;
  tipoEstoqueNome: string;
  produtoNome: string;
  antes: Quantidade;
  depois: Quantidade;
};

export function buildManualAdjustmentDisplay(
  mov: EstoqueMovimentoRecord,
): ManualAdjustmentDisplay {
  return {
    id: mov.id,
    createdAt: mov.createdAt,
    tipoEstoqueNome: mov.tipoEstoqueNome,
    produtoNome: mov.produtoNome,
    antes: calcularSaldoAntes(mov.saldo, mov.delta),
    depois: mov.saldo,
  };
}

export function formatAdjustmentTime(iso: string, showDate: boolean): string {
  const date = new Date(iso);
  const time = date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  if (!showDate) return time;
  const day = date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
  return `${day} · ${time}`;
}
