import type { MotivoAfastamento } from './afastamento';
import { ExamePrazo } from './exame-prazo';
import { ProximoVencimentoExperiencia } from './proximo-vencimento-experiencia';
import type { Regime } from './regime-cadastro';
import type { SetorTipo } from './setor-edicao';
import type { SituacaoColaborador } from './situacao-colaborador';

export type ColaboradorListaItem = {
  codigo: string;
  nome: string;
  situacao: SituacaoColaborador;
  afastamento?: MotivoAfastamento | null;
  setorNome: string | null;
  setorTipo?: SetorTipo | null;
  turnoNome: string | null;
  turnoCodigo: string | null;
  liderSetor: boolean;
  avisoAtivo: boolean;
  ultimoExame: string | null;
  regime: Regime;
  cnpj: string | null;
  razaoSocial: string | null;
  dataDesligamento: string | null;
  dataAdmissao: string | null;
  indicacao: string | null;
  ferias?: { inicio: string; volta: string } | null;
};

export type VencimentoLista = '' | 'experiencia' | 'exame';

export type ColaboradorListaCriterio = {
  termo?: string;
  setor?: string;
  turno?: string;
  situacao?: string;
  aviso?: boolean;
  lider?: string;
  regime?: '' | Regime;
  vencimento?: VencimentoLista;
  hoje?: string;
};

export class ColaboradorListaFiltro {
  static readonly EXAME_A_VENCER_DIAS = 14;

  constructor(
    private readonly experiencia = new ProximoVencimentoExperiencia(),
    private readonly exames = new ExamePrazo(),
  ) {}

  aplicar(
    itens: ColaboradorListaItem[],
    termoOuCriterio: string | ColaboradorListaCriterio,
  ): ColaboradorListaItem[] {
    const criterio = typeof termoOuCriterio === 'string' ? { termo: termoOuCriterio } : termoOuCriterio;
    return itens.filter((item) => this.aceita(item, criterio));
  }

  private aceita(item: ColaboradorListaItem, criterio: ColaboradorListaCriterio): boolean {
    if (criterio.setor && item.setorNome !== criterio.setor) return false;
    if (criterio.turno && item.turnoNome !== criterio.turno) return false;
    if (criterio.situacao && item.situacao !== criterio.situacao) return false;
    if (criterio.regime && item.regime !== criterio.regime) return false;
    if (criterio.aviso && !item.avisoAtivo) return false;
    if (criterio.lider === 'sim' && !item.liderSetor) return false;
    if (criterio.lider === 'nao' && item.liderSetor) return false;
    if (criterio.vencimento === 'experiencia' && !this.experienciaPerto(item, criterio.hoje)) return false;
    if (criterio.vencimento === 'exame' && !this.examePerto(item, criterio.hoje)) return false;
    const termoBruto = criterio.termo ?? '';
    const termo = this.normalizar(termoBruto);
    if (!termo) return true;
    return this.textoBate(item, termo) || this.cnpjBate(item, termoBruto);
  }

  private experienciaPerto(item: ColaboradorListaItem, hoje: string | undefined): boolean {
    if (item.situacao === 'desligado') return false;
    return this.experiencia.pertoDeVencer(item.dataAdmissao, hoje ?? '');
  }

  private examePerto(item: ColaboradorListaItem, hoje: string | undefined): boolean {
    if (item.situacao === 'desligado' || item.regime !== 'clt') return false;
    const dia = hoje ?? '';
    if (this.experiencia.proximo(item.dataAdmissao, dia)) return false;
    const situacao = this.exames.calcular(item.ultimoExame, dia);
    return situacao.dias !== null && situacao.dias >= 0 && situacao.dias <= ColaboradorListaFiltro.EXAME_A_VENCER_DIAS;
  }

  private textoBate(item: ColaboradorListaItem, termo: string): boolean {
    return [item.nome, item.codigo, item.razaoSocial ?? '', item.indicacao ?? ''].some((texto) =>
      this.normalizar(texto).includes(termo),
    );
  }

  private cnpjBate(item: ColaboradorListaItem, termoBruto: string): boolean {
    if (!item.cnpj || !/^\s*[\d\s./-]+\s*$/.test(termoBruto)) return false;
    const digitos = termoBruto.replace(/\D/g, '');
    return digitos.length >= 5 && item.cnpj.includes(digitos);
  }

  private normalizar(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR');
  }
}
