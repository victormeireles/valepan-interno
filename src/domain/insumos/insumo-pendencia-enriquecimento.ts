import type { OmieRecebimentoItem } from '@/domain/types/insumo-estoque';
import type { OmieRecebimentoCabecEnriquecido } from '@/domain/types/omie-recebimento-enriquecido';
import type { AtualizarEnriquecimentoPendenciaInput } from '@/domain/types/insumo-estoque-db';
import { converterDataOmieParaIso } from '@/domain/insumos/omie-date';

export function montarEnriquecimentoPendencia(input: {
  cabec?: OmieRecebimentoCabecEnriquecido;
  item: OmieRecebimentoItem;
}): AtualizarEnriquecimentoPendenciaInput {
  const dataEmissaoIso = converterDataOmieParaIso(input.cabec?.dDataEmissao ?? null);

  return {
    fornecedorRazaoSocial: input.cabec?.fornecedorRazaoSocial ?? null,
    fornecedorNome: input.cabec?.fornecedorNome ?? null,
    fornecedorCnpj: input.cabec?.fornecedorCnpj ?? null,
    naturezaOperacao: input.cabec?.naturezaOperacao ?? null,
    valorTotalNf: input.cabec?.valorTotalNf ?? null,
    cfopEntrada: input.item.cfopEntrada,
    ncmProduto: input.item.ncm,
    numeroNf: input.cabec?.cNumeroNF || undefined,
    dataEmissaoNf: dataEmissaoIso ?? undefined,
  };
}

export function indexarItensRecebimentoPorIdItem(
  itens: OmieRecebimentoItem[],
): Map<number, OmieRecebimentoItem> {
  return new Map(itens.map((item) => [item.nIdItem, item]));
}
