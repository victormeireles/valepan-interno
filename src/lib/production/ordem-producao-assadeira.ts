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
 * Resolve `assadeira_id` a partir do valor guardado em `tipo_lata` (UUID da assadeira no cadastro
 * `produto_assadeiras`). Se não reconhecido ou vazio, usa a primeira candidata (lista já ordenada no servidor).
 */
export function resolveAssadeiraIdFromLataSelecao(
  tipoLataOuAssadeiraId: string,
  _meta: ProdutoUnidadesLataMeta,
  candidatos: AssadeiraCandidato[],
): string | null {
  if (!candidatos.length) return null;
  const raw = String(tipoLataOuAssadeiraId ?? '').trim();
  if (raw && candidatos.some((c) => c.assadeira_id === raw)) {
    return raw;
  }
  return candidatos[0]!.assadeira_id;
}
