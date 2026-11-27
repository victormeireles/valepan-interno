import type { SetorTipo } from './setor-edicao';
import type { SituacaoColaborador } from './situacao-colaborador';
import type { FaltaSetorTipoFiltroValor } from './falta-setor-tipo-filtro';
import type { FaltaSituacaoFiltroValor } from './falta-situacao-filtro';

export type PessoaBaseFalta = {
  codigo: string;
  situacao: SituacaoColaborador;
  avisoAtivo: boolean;
  setorTipo: SetorTipo | null;
};

export type FaltaParaTotal = {
  codigo: string;
  cancelada: boolean;
  situacao: SituacaoColaborador;
  setorTipo: SetorTipo | null;
};

export type FaltaTotalFiltro = {
  situacao: FaltaSituacaoFiltroValor;
  setorTipo: FaltaSetorTipoFiltroValor;
};

export class FaltaTotalPessoas {
  contar(pessoas: PessoaBaseFalta[], faltas: FaltaParaTotal[], filtro: FaltaTotalFiltro): number {
    const noPosto = pessoas.filter((pessoa) => this.noPosto(pessoa, filtro)).length;
    if (filtro.situacao !== 'todos' && filtro.situacao !== 'desligados') return noPosto;
    const desligados = this.desligadosComFalta(faltas, filtro.setorTipo);
    return filtro.situacao === 'desligados' ? desligados : noPosto + desligados;
  }

  private noPosto(pessoa: PessoaBaseFalta, filtro: FaltaTotalFiltro): boolean {
    if (pessoa.situacao === 'desligado') return false;
    if (!this.setorCompativel(pessoa.setorTipo, filtro.setorTipo)) return false;
    if (filtro.situacao === 'todos') return true;
    if (filtro.situacao === 'ativos') return pessoa.situacao === 'ativo' && !pessoa.avisoAtivo;
    if (filtro.situacao === 'aviso') return pessoa.situacao === 'ativo' && pessoa.avisoAtivo;
    if (filtro.situacao === 'fora_do_posto') return pessoa.situacao === 'afastado';
    return pessoa.situacao === 'admissao_prevista';
  }

  private desligadosComFalta(faltas: FaltaParaTotal[], setorTipo: FaltaSetorTipoFiltroValor): number {
    const codigos = new Set<string>();
    for (const falta of faltas) {
      if (!this.faltaDeDesligado(falta, setorTipo)) continue;
      codigos.add(falta.codigo);
    }
    return codigos.size;
  }

  private faltaDeDesligado(falta: FaltaParaTotal, setorTipo: FaltaSetorTipoFiltroValor): boolean {
    return !falta.cancelada && falta.situacao === 'desligado' && this.setorCompativel(falta.setorTipo, setorTipo);
  }

  private setorCompativel(tipo: SetorTipo | null, filtro: FaltaSetorTipoFiltroValor): boolean {
    if (filtro === 'todos') return true;
    return tipo === filtro;
  }
}
