export function mensagemExcecaoReceitaCaixaInvalida(
  receita: { tipo: string } | null,
): string | null {
  if (!receita) return 'Receita de caixa não encontrada';
  if (receita.tipo !== 'caixa') return 'A exceção deve ser uma receita do tipo caixa';
  return null;
}

export function rotuloExcecaoCaixa(nomeReceita: string | null | undefined): string {
  const nome = nomeReceita?.trim();
  return nome ? nome : 'Produto';
}
