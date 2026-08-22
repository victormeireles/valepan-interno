import { EtapaContinuidadeCopy } from './etapa-continuidade-copy';

export type EtapaContinuidadeInput = {
  totalProjetado: number;
  metaReferencia: number;
  unidade: string;
};

export type EtapaContinuidadeResult = {
  usualContinuaProduzindo: boolean;
  requerConfirmacaoAoContinuar: boolean;
  requerConfirmacaoAoFinalizar: boolean;
  quantidadeNaoProduzida: number;
  textoConfirmacaoContinuar: string;
  textoConfirmacaoFinalizar: string;
};

export function resolveEtapaContinuidade(
  input: EtapaContinuidadeInput,
): EtapaContinuidadeResult {
  const { totalProjetado, metaReferencia, unidade } = input;
  const abaixoDaMeta = totalProjetado < metaReferencia;

  if (abaixoDaMeta) {
    const quantidadeNaoProduzida = metaReferencia - totalProjetado;
    return {
      usualContinuaProduzindo: true,
      requerConfirmacaoAoContinuar: false,
      requerConfirmacaoAoFinalizar: true,
      quantidadeNaoProduzida,
      textoConfirmacaoContinuar: '',
      textoConfirmacaoFinalizar: EtapaContinuidadeCopy.confirmarFinalizarAbaixo(
        quantidadeNaoProduzida,
        unidade,
      ),
    };
  }

  return {
    usualContinuaProduzindo: false,
    requerConfirmacaoAoContinuar: true,
    requerConfirmacaoAoFinalizar: false,
    quantidadeNaoProduzida: 0,
    textoConfirmacaoContinuar: EtapaContinuidadeCopy.confirmarContinuar(),
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
