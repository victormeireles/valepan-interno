export const RECLAMACAO_UNIDADES = ['pacotes', 'caixas'] as const;
export type ReclamacaoUnidade = (typeof RECLAMACAO_UNIDADES)[number];

export function isReclamacaoUnidade(value: string): value is ReclamacaoUnidade {
  return (RECLAMACAO_UNIDADES as readonly string[]).includes(value);
}

export const RECLAMACAO_QUANTIDADE_INVALIDA =
  'Informe um número inteiro maior que zero.';

export function assertReclamacaoQuantidade(
  quantidade: number | null,
  unidade: string,
): string | null {
  if (quantidade == null) return null;
  if (!Number.isInteger(quantidade) || quantidade < 1) {
    return RECLAMACAO_QUANTIDADE_INVALIDA;
  }
  if (!isReclamacaoUnidade(unidade)) {
    return 'Informe pacotes ou caixas.';
  }
  return null;
}

export function quantidadeParaGravar(
  quantidade: number | null,
  unidade: string,
): { quantidade: number | null; unidade: ReclamacaoUnidade | null } {
  if (quantidade == null || !isReclamacaoUnidade(unidade)) {
    return { quantidade: null, unidade: null };
  }
  return { quantidade, unidade };
}

export function formatarReclamacaoQuantidade(
  quantidade: number | null,
  unidade: ReclamacaoUnidade | null,
): string {
  if (quantidade == null || unidade == null) return '—';
  return unidade === 'caixas' ? `${quantidade} CX` : `${quantidade} pacotes`;
}
