import type { QuadroNumeros } from './quadro-montagem';
import { QuadroOcupacao } from './quadro-ocupacao';
import { FeriasPeriodo, type PeriodoFerias } from './ferias-periodo';

export type PessoaFeriasQuadro = {
  papel: string;
  ferias?: PeriodoFerias | null;
};

const periodo = new FeriasPeriodo();
const ocupacao = new QuadroOcupacao();

export class FeriasQuadro {
  contar(pessoas: PessoaFeriasQuadro[], hoje: string): number {
    return pessoas.filter(
      (pessoa) => pessoa.papel === 'ocupacao' && pessoa.ferias && periodo.estado(pessoa.ferias, hoje) === 'em_gozo',
    ).length;
  }

  nota(numeros: QuadroNumeros): string | null {
    const ferias = numeros.ferias ?? 0;
    if (ferias <= 0) return null;
    const quantidade = ferias.toLocaleString('pt-BR');
    const noPosto = ocupacao.segmentos(numeros).noPosto.toLocaleString('pt-BR');
    const vaga = ferias === 1 ? 'A vaga continua da pessoa.' : 'A vaga continua de cada um.';
    return `${quantidade} em férias. No posto: ${noPosto}. ${vaga}`;
  }

  resumo(ferias: number): string | null {
    if (ferias <= 0) return null;
    return `${ferias.toLocaleString('pt-BR')} em férias`;
  }
}
