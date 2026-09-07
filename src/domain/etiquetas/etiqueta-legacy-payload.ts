export type LegacyEtiquetaGerarBody = {
  produtoId?: string;
  produto: string;
  nomeEtiqueta: string;
  dataFabricacao: string;
  diasValidade: number;
  diasValidadeCongelado: number;
  congelado: boolean;
  mostrarTextoCongelado: boolean;
  lote: number;
  cliente: string;
};

export type ResolvedEtiquetaConfig = {
  nomeEtiqueta: string;
  diasValidade: number;
  diasValidadeCongelado: number;
  congelado: boolean;
  mostrarTextoCongelado: boolean;
  lote: number;
};

export function buildLegacyEtiquetaGerarBody(input: {
  produtoId?: string;
  produtoNome: string;
  tipoEstoqueNome: string;
  dataFabricacao: string;
  resolved: ResolvedEtiquetaConfig;
}): LegacyEtiquetaGerarBody {
  return {
    ...(input.produtoId ? { produtoId: input.produtoId } : {}),
    produto: input.produtoNome,
    nomeEtiqueta: input.resolved.nomeEtiqueta,
    dataFabricacao: input.dataFabricacao,
    diasValidade: input.resolved.diasValidade,
    diasValidadeCongelado: input.resolved.diasValidadeCongelado,
    congelado: input.resolved.congelado,
    mostrarTextoCongelado: input.resolved.mostrarTextoCongelado,
    lote: input.resolved.lote,
    cliente: input.tipoEstoqueNome,
  };
}
