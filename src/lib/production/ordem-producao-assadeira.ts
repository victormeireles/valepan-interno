import type { OrdemProducaoTipoLata } from '@/domain/types/ordem-producao';

export type AssadeiraCandidato = {
  assadeira_id: string;
  unidades_por_assadeira: number;
};

export type ProdutoUnidadesLataMeta = {
  unidades_assadeira: number | null;
  unidades_lata_antiga: number | null;
  unidades_lata_nova: number | null;
};

/**
 * Escolhe assadeira_id a partir do tipo de lata da ordem diária e das linhas
 * `produto_assadeiras` (já ordenadas como a UI deve preferir).
 */
export function resolveAssadeiraIdForTipoLata(
  tipoLata: OrdemProducaoTipoLata,
  meta: ProdutoUnidadesLataMeta,
  candidatos: AssadeiraCandidato[],
): string | null {
  if (!candidatos.length) return null;

  const ua = meta.unidades_assadeira;
  const uAnt = meta.unidades_lata_antiga ?? ua;
  const uNova = meta.unidades_lata_nova;

  const matchUnidades = (u: number | null | undefined): string | null => {
    if (u == null || !Number.isFinite(u)) return null;
    const c = candidatos.find((x) => x.unidades_por_assadeira === u);
    return c?.assadeira_id ?? null;
  };

  if (tipoLata === 'antiga') {
    return matchUnidades(uAnt) ?? candidatos[0]!.assadeira_id;
  }
  if (tipoLata === 'nova') {
    return matchUnidades(uNova) ?? candidatos[0]!.assadeira_id;
  }
  // outra: primeira cujo par de unidades não coincide só com antiga nem só com nova
  for (const c of candidatos) {
    const isAnt = uAnt != null && c.unidades_por_assadeira === uAnt;
    const isNov = uNova != null && c.unidades_por_assadeira === uNova;
    if (!isAnt && !isNov) return c.assadeira_id;
  }
  return candidatos[0]!.assadeira_id;
}
