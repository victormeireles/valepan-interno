export type InsumoSelecionadoResumo = {
  id: string;
  nome: string;
  unidadeCodigo: string;
  unidadeNome: string;
};

export type SugestaoFatorConversao = {
  label: string;
  value: number;
};

export function formatUnidadeLabel(codigo?: string | null, nome?: string | null): string {
  const code = codigo?.trim();
  if (code) return code.toUpperCase();
  return nome?.trim() || 'un';
}

export function buildFatorConversaoLabel(unidadeNf: string, unidadeInsumo: string): string {
  const nf = formatUnidadeLabel(unidadeNf, unidadeNf);
  const insumo = formatUnidadeLabel(unidadeInsumo, unidadeInsumo);

  if (nf === insumo) {
    return `Quantos ${insumo} há em cada unidade da nota fiscal?`;
  }

  return `Quantos ${insumo} vêm em cada ${nf} da nota fiscal?`;
}

export function buildFatorConversaoHint(unidadeNf: string, unidadeInsumo: string): string {
  const nf = formatUnidadeLabel(unidadeNf, unidadeNf);
  const insumo = formatUnidadeLabel(unidadeInsumo, unidadeInsumo);

  if (nf === insumo) {
    return `Ex.: caixa de 25 ${insumo} → 25; se a qtd da NF já é o peso total → 1`;
  }

  return `Ex.: 1 ${nf} com 25 ${insumo} → 25; conversão direta → 1`;
}

export function buildSugestoesFatorConversao(input: {
  descricaoOmie: string;
  unidadeNf: string | null;
  unidadeInsumo: string | null;
}): SugestaoFatorConversao[] {
  const unidadeNf = formatUnidadeLabel(input.unidadeNf, input.unidadeNf);
  const unidadeInsumo = formatUnidadeLabel(input.unidadeInsumo, input.unidadeInsumo);
  const sugestoes: SugestaoFatorConversao[] = [
    { label: unidadeNf === unidadeInsumo ? 'Peso já na NF (1)' : '1:1', value: 1 },
  ];

  const weightMatch = input.descricaoOmie.match(/(\d+(?:[.,]\d+)?)\s*KG\b/i);
  if (weightMatch) {
    const peso = Number(weightMatch[1].replace(',', '.'));
    if (Number.isFinite(peso) && peso > 0) {
      sugestoes.push({
        label: `${peso.toLocaleString('pt-BR')} ${unidadeInsumo}/un.`,
        value: peso,
      });
    }
  }

  return sugestoes;
}
