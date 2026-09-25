export type SituacaoPessoa = 'ativo' | 'admissao_prevista' | 'desligado';

export type PessoaQuadro = {
  codigo: string;
  situacao: SituacaoPessoa;
  setorCodigo: string | null;
  turnoCodigo: string | null;
  noQuadro: boolean;
};

export type VagaAprovada = {
  setorCodigo: string;
  turnoCodigo: string;
  quantidade: number;
};

export type PosicaoPlanejada = {
  codigo: string;
  setorCodigo: string;
  turnoCodigo: string;
};

export type AlocacaoPlanejada = {
  pessoaCodigo: string;
  setorCodigo: string;
  turnoCodigo: string;
  papel: 'ocupacao' | 'reserva' | 'apoio';
  posicaoCodigo: string | null;
};

export type QuadroMontagemResultado = {
  posicoes: PosicaoPlanejada[];
  alocacoes: AlocacaoPlanejada[];
  erros: { codigo: string; motivo: string }[];
};

export type QuadroNumeros = {
  aprovado: number;
  contratados: number;
  reservas: number;
  livres: number;
};

export class QuadroMontagem {
  montar(vagas: VagaAprovada[], pessoas: PessoaQuadro[]): QuadroMontagemResultado {
    const posicoes = this.criarPosicoes(vagas);
    const livres = this.agrupar(posicoes);
    const alocacoes: AlocacaoPlanejada[] = [];
    const erros: { codigo: string; motivo: string }[] = [];

    for (const pessoa of this.ordenar(pessoas)) {
      const alocacao = this.alocar(pessoa, livres, erros);
      if (alocacao) alocacoes.push(alocacao);
    }

    return { posicoes, alocacoes, erros };
  }

  private criarPosicoes(vagas: VagaAprovada[]): PosicaoPlanejada[] {
    const posicoes: PosicaoPlanejada[] = [];
    for (const vaga of vagas) {
      for (let i = 1; i <= vaga.quantidade; i += 1) {
        posicoes.push({
          codigo: `${vaga.turnoCodigo}-${String(i).padStart(2, '0')}`,
          setorCodigo: vaga.setorCodigo,
          turnoCodigo: vaga.turnoCodigo,
        });
      }
    }
    return posicoes;
  }

  private agrupar(posicoes: PosicaoPlanejada[]): Map<string, string[]> {
    const livres = new Map<string, string[]>();
    for (const posicao of posicoes) {
      const chave = this.chave(posicao.setorCodigo, posicao.turnoCodigo);
      const lista = livres.get(chave) ?? [];
      lista.push(posicao.codigo);
      livres.set(chave, lista);
    }
    return livres;
  }

  private alocar(
    pessoa: PessoaQuadro,
    livres: Map<string, string[]>,
    erros: { codigo: string; motivo: string }[],
  ): AlocacaoPlanejada | null {
    if (pessoa.situacao === 'desligado') return null;
    if (!pessoa.setorCodigo || !pessoa.turnoCodigo) return null;
    if (!pessoa.noQuadro) {
      return this.apoio(pessoa);
    }
    const codigo = livres.get(this.chave(pessoa.setorCodigo, pessoa.turnoCodigo))?.shift();
    if (!codigo) {
      erros.push({ codigo: pessoa.codigo, motivo: 'sem vaga livre' });
      return null;
    }
    return {
      pessoaCodigo: pessoa.codigo,
      setorCodigo: pessoa.setorCodigo,
      turnoCodigo: pessoa.turnoCodigo,
      papel: pessoa.situacao === 'admissao_prevista' ? 'reserva' : 'ocupacao',
      posicaoCodigo: codigo,
    };
  }

  private apoio(pessoa: PessoaQuadro): AlocacaoPlanejada {
    return {
      pessoaCodigo: pessoa.codigo,
      setorCodigo: pessoa.setorCodigo ?? '',
      turnoCodigo: pessoa.turnoCodigo ?? '',
      papel: 'apoio',
      posicaoCodigo: null,
    };
  }

  private ordenar(pessoas: PessoaQuadro[]): PessoaQuadro[] {
    return [...pessoas].sort((a, b) => a.codigo.localeCompare(b.codigo));
  }

  private chave(setor: string, turno: string): string {
    return `${setor}|${turno}`;
  }
}

export class QuadroContagem {
  contar(resultado: QuadroMontagemResultado): QuadroNumeros {
    const aprovado = resultado.posicoes.length;
    const contratados = this.papel(resultado, 'ocupacao');
    const reservas = this.papel(resultado, 'reserva');
    return {
      aprovado,
      contratados,
      reservas,
      livres: aprovado - contratados - reservas,
    };
  }

  private papel(resultado: QuadroMontagemResultado, papel: AlocacaoPlanejada['papel']): number {
    return resultado.alocacoes.filter((a) => a.papel === papel).length;
  }
}
