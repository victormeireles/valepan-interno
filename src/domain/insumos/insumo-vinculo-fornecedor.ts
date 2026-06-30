import { buildPendenciaGrupoChave } from '@/domain/insumos/insumo-pendencia-grupo';
import { agregarValorUnitarioNfDePendencias } from '@/domain/insumos/insumo-nf-valor-unitario';
import {
  buildPendenciaGrupoContexto,
  type InsumoPendenciaGrupoContexto,
} from '@/domain/insumos/insumo-pendencia-grupo-contexto';
import type {
  InsumoPendenciaComEmpresa,
  IntegracaoInsumoListItem,
  IntegracaoInsumoListItemBase,
} from '@/domain/types/insumo-estoque-db';

export type { IntegracaoInsumoListItemBase };

const contextoVazio = buildPendenciaGrupoContexto([]);

function contagemVazia() {
  return { nfsDistintas: 0, pendenciaCount: 0 };
}

function groupPendenciasPorProduto(
  pendencias: InsumoPendenciaComEmpresa[],
): Map<string, InsumoPendenciaComEmpresa[]> {
  const map = new Map<string, InsumoPendenciaComEmpresa[]>();

  for (const pendencia of pendencias) {
    const chave = buildPendenciaGrupoChave(pendencia.empresa_id, pendencia.omie_id_produto);
    const existing = map.get(chave);
    if (existing) {
      existing.push(pendencia);
      continue;
    }
    map.set(chave, [pendencia]);
  }

  return map;
}

export function enrichIntegracaoInsumosComFornecedor(
  vinculos: IntegracaoInsumoListItemBase[],
  pendencias: InsumoPendenciaComEmpresa[],
): IntegracaoInsumoListItem[] {
  const pendenciasPorProduto = groupPendenciasPorProduto(pendencias);

  return vinculos.map((vinculo) => {
    const chave = buildPendenciaGrupoChave(vinculo.empresa_id, vinculo.omie_id_produto);
    const pendenciasDoProduto = pendenciasPorProduto.get(chave) ?? [];
    const contexto: InsumoPendenciaGrupoContexto =
      pendenciasDoProduto.length > 0
        ? buildPendenciaGrupoContexto(pendenciasDoProduto)
        : contextoVazio;
    const { valorUnitarioNf, unidadeNf } = agregarValorUnitarioNfDePendencias(pendenciasDoProduto);
    const { nfsDistintas, pendenciaCount } =
      pendenciasDoProduto.length > 0
        ? {
            nfsDistintas: new Set(
              pendenciasDoProduto.map((pendencia) => pendencia.numero_nf).filter(Boolean),
            ).size,
            pendenciaCount: pendenciasDoProduto.length,
          }
        : contagemVazia();

    return {
      ...vinculo,
      contexto,
      valorUnitarioNf,
      unidadeNf,
      nfsDistintas,
      pendenciaCount,
    };
  });
}
