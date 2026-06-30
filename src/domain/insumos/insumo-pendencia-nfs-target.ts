import type { InsumoPendenciaStatus } from '@/domain/types/insumo-estoque';
import type { InsumoPendenciaGrupoContexto } from '@/domain/insumos/insumo-pendencia-grupo-contexto';

export type InsumoPendenciaNfsTarget = {
  empresaId: string;
  omieIdProduto: number;
  descricaoProduto: string | null;
  nfsDistintas: number;
  pendenciaCount: number;
  unidadeNf: string | null;
  contexto: InsumoPendenciaGrupoContexto;
  statuses: InsumoPendenciaStatus[];
};

export function buildNfsTargetCacheKey(target: InsumoPendenciaNfsTarget): string {
  return `${target.empresaId}:${target.omieIdProduto}:${target.statuses.join(',')}`;
}
