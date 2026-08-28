export const RECLAMACAO_UNIDADES = ['pacotes', 'caixas'] as const;
export type ReclamacaoUnidade = (typeof RECLAMACAO_UNIDADES)[number];

export function isReclamacaoUnidade(value: string): value is ReclamacaoUnidade {
  return (RECLAMACAO_UNIDADES as readonly string[]).includes(value);
}

export function assertReclamacaoQuantidade(
  quantidade: number,
  unidade: string,
): string | null {
  if (!Number.isInteger(quantidade) || quantidade < 1) {
    return 'Informe a quantidade.';
  }
  if (!isReclamacaoUnidade(unidade)) {
    return 'Informe pacotes ou caixas.';
  }
  return null;
}

export function formatarReclamacaoQuantidade(
  quantidade: number,
  unidade: ReclamacaoUnidade,
): string {
  return unidade === 'caixas' ? `${quantidade} CX` : `${quantidade} pacotes`;
}
