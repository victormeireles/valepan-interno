import type { EstoqueMovimentoRecord } from '@/domain/types/estoque-db';
import type { SaidaQuantidade, SaidaSheetRecord } from '@/domain/types/saidas';

function absQuantidade(delta: SaidaQuantidade): SaidaQuantidade {
  return {
    caixas: Math.abs(delta.caixas || 0),
    pacotes: Math.abs(delta.pacotes || 0),
    unidades: Math.abs(delta.unidades || 0),
    kg: Math.abs(delta.kg || 0),
  };
}

function dataFromMovimento(createdAt: string): string {
  return createdAt.slice(0, 10);
}

export function movimentoToSaidaRecord(movimento: EstoqueMovimentoRecord): SaidaSheetRecord {
  const quantidade = absQuantidade(movimento.delta);

  return {
    id: movimento.id,
    data: dataFromMovimento(movimento.createdAt),
    cliente: movimento.clienteDestino ?? '',
    observacao: '',
    produto: movimento.produtoNome,
    meta: quantidade,
    realizado: quantidade,
    createdAt: movimento.createdAt,
    updatedAt: movimento.createdAt,
    saidaUpdatedAt: movimento.createdAt,
  };
}

export function deltaFromQuantidade(quantidade: SaidaQuantidade) {
  return {
    caixas: -(quantidade.caixas || 0),
    pacotes: -(quantidade.pacotes || 0),
    unidades: -(quantidade.unidades || 0),
    kg: -(quantidade.kg || 0),
  };
}
