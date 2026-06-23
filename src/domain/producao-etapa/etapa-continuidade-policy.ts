export type EtapaContinuidadeInput = {
  totalProjetado: number;
  metaReferencia: number;
  unidade: string;
};

export type EtapaContinuidadeResult = {
  usualContinuaProduzindo: boolean;
  requerConfirmacaoAoContinuar: boolean;
  requerConfirmacaoAoFinalizar: boolean;
  textoConfirmacaoContinuar: string;
  textoConfirmacaoFinalizar: string;
};

const TEXTO_CONFIRMACAO_CONTINUAR =
  'Sim, confirmo que ainda vou produzir mais';

export function resolveEtapaContinuidade(
  input: EtapaContinuidadeInput,
): EtapaContinuidadeResult {
  const { totalProjetado, metaReferencia, unidade } = input;
  const abaixoDaMeta = totalProjetado < metaReferencia;

  if (abaixoDaMeta) {
    const perda = metaReferencia - totalProjetado;
    return {
      usualContinuaProduzindo: true,
      requerConfirmacaoAoContinuar: false,
      requerConfirmacaoAoFinalizar: true,
      textoConfirmacaoContinuar: '',
      textoConfirmacaoFinalizar: `Sim, confirmo encerrar com perda de ${perda} ${unidade}`,
    };
  }

  return {
    usualContinuaProduzindo: false,
    requerConfirmacaoAoContinuar: true,
    requerConfirmacaoAoFinalizar: false,
    textoConfirmacaoContinuar: TEXTO_CONFIRMACAO_CONTINUAR,
    textoConfirmacaoFinalizar: '',
  };
}

export function requerConfirmacao(
  continuaProduzindo: boolean,
  result: EtapaContinuidadeResult,
): boolean {
  return continuaProduzindo
    ? result.requerConfirmacaoAoContinuar
    : result.requerConfirmacaoAoFinalizar;
}
