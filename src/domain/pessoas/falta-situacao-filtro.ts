import type { SituacaoColaborador } from './situacao-colaborador';

export type FaltaSituacaoFiltroValor =
  | 'todos'
  | 'ativos'
  | 'aviso'
  | 'fora_do_posto'
  | 'admissao_prevista'
  | 'desligados';

export const FALTA_SITUACAO_PADRAO: FaltaSituacaoFiltroValor = 'todos';

export const FALTA_SITUACAO_OPCOES: { value: FaltaSituacaoFiltroValor; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'ativos', label: 'Ativos' },
  { value: 'aviso', label: 'Em aviso' },
  { value: 'fora_do_posto', label: 'Fora do posto' },
  { value: 'admissao_prevista', label: 'Admissão prevista' },
  { value: 'desligados', label: 'Desligados' },
];

type PessoaSituacao = {
  situacao: SituacaoColaborador;
  avisoAtivo: boolean;
};

export class FaltaSituacaoFiltro {
  aplicar<T extends PessoaSituacao>(itens: T[], valor: FaltaSituacaoFiltroValor): T[] {
    if (valor === 'todos') return itens;
    return itens.filter((item) => this.aceita(item, valor));
  }

  private aceita(item: PessoaSituacao, valor: FaltaSituacaoFiltroValor): boolean {
    if (valor === 'ativos') return item.situacao === 'ativo' && !item.avisoAtivo;
    if (valor === 'aviso') return item.situacao === 'ativo' && item.avisoAtivo;
    if (valor === 'fora_do_posto') return item.situacao === 'afastado';
    if (valor === 'admissao_prevista') return item.situacao === 'admissao_prevista';
    return item.situacao === 'desligado';
  }
}
