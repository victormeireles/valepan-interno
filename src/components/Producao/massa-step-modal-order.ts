import type { ProductionQueueItem } from './queue/production-queue-types';

export type MassaStepOrder = {
  id: string;
  lote_codigo: string;
  qtd_planejada: number;
  produto: {
    id: string;
    nome: string;
    unidadeNomeResumido: string | null;
    unidades_assadeira?: number | null;
    box_units?: number | null;
    receita_massa?: {
      quantidade_por_produto: number;
    } | null;
  };
};

export function toMassaStepOrder(item: ProductionQueueItem): MassaStepOrder {
  return {
    id: item.id,
    lote_codigo: item.lote_codigo,
    qtd_planejada: item.qtd_planejada,
    produto: {
      id: item.produto_id,
      nome: item.produtos.nome,
      unidadeNomeResumido: item.produtos.unidadeNomeResumido,
      unidades_assadeira: item.produtos.unidades_assadeira ?? null,
      box_units: item.produtos.box_units ?? null,
      receita_massa: item.produtos.receita_massa ?? null,
    },
  };
}
