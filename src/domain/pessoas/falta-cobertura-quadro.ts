import type { SituacaoColaborador } from './situacao-colaborador';

export type PessoaCobertura = {
  situacao: SituacaoColaborador;
  avisoAtivo: boolean;
};

export type FaltaCobertura = {
  quadro: number;
  ativos: number;
};

export class FaltaCoberturaQuadro {
  contar(pessoas: PessoaCobertura[]): FaltaCobertura {
    let quadro = 0;
    let ativos = 0;
    for (const pessoa of pessoas) {
      if (pessoa.situacao === 'desligado') continue;
      quadro += 1;
      if (this.ativo(pessoa)) ativos += 1;
    }
    return { quadro, ativos };
  }

  private ativo(pessoa: PessoaCobertura): boolean {
    return pessoa.situacao === 'ativo' && !pessoa.avisoAtivo;
  }
}
