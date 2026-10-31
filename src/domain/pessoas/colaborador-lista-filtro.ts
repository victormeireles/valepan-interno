import type { MotivoAfastamento } from './afastamento';
import type { Regime } from './regime-cadastro';
import type { SituacaoColaborador } from './situacao-colaborador';

export type ColaboradorListaItem = {
  codigo: string;
  nome: string;
  situacao: SituacaoColaborador;
  afastamento?: MotivoAfastamento | null;
  setorNome: string | null;
  turnoNome: string | null;
  turnoCodigo: string | null;
  liderSetor: boolean;
  avisoAtivo: boolean;
  ultimoExame: string | null;
  regime: Regime;
  cnpj: string | null;
  razaoSocial: string | null;
  dataDesligamento: string | null;
};

export type ColaboradorListaCriterio = {
  termo?: string;
  setor?: string;
  turno?: string;
  situacao?: string;
  aviso?: boolean;
  lider?: string;
  regime?: '' | Regime;
};

export class ColaboradorListaFiltro {
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
    const termoBruto = criterio.termo ?? '';
    const termo = this.normalizar(termoBruto);
    if (!termo) return true;
    return this.textoBate(item, termo) || this.cnpjBate(item, termoBruto);
  }

  private textoBate(item: ColaboradorListaItem, termo: string): boolean {
    return [item.nome, item.codigo, item.razaoSocial ?? ''].some((texto) =>
      this.normalizar(texto).includes(termo),
    );
  }

  private cnpjBate(item: ColaboradorListaItem, termoBruto: string): boolean {
    const digitos = termoBruto.replace(/\D/g, '');
    return digitos.length > 0 && !!item.cnpj && item.cnpj.includes(digitos);
  }

  private normalizar(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR');
  }
}
