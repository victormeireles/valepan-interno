import type { InsumoPendenciaProdutoGrupo } from '@/domain/insumos/insumo-pendencia-grupo';
import type { InsumoPendenciaNfsTarget } from '@/domain/insumos/insumo-pendencia-nfs-target';
import type { InsumoPendenciaStatus } from '@/domain/types/insumo-estoque';
import type { IntegracaoInsumoListItem } from '@/domain/types/insumo-estoque-db';

export function buildNfsTargetFromGrupo(
  grupo: InsumoPendenciaProdutoGrupo,
  statuses: InsumoPendenciaStatus[],
): InsumoPendenciaNfsTarget {
  return {
    empresaId: grupo.empresaId,
    omieIdProduto: grupo.omieIdProduto,
    descricaoProduto: grupo.descricaoProduto,
    nfsDistintas: grupo.nfsDistintas,
    pendenciaCount: grupo.pendenciaCount,
    unidadeNf: grupo.unidadeNf,
    contexto: grupo.contexto,
    statuses,
  };
}

export function buildNfsTargetFromVinculo(item: IntegracaoInsumoListItem): InsumoPendenciaNfsTarget {
  return {
    empresaId: item.empresa_id,
    omieIdProduto: item.omie_id_produto,
    descricaoProduto: item.descricao_omie,
    nfsDistintas: item.nfsDistintas,
    pendenciaCount: item.pendenciaCount,
    unidadeNf: item.unidadeNf,
    contexto: item.contexto,
    statuses: ['resolvido'],
  };
}
