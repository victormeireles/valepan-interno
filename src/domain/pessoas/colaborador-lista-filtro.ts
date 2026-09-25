export type ColaboradorListaItem = {
  codigo: string;
  nome: string;
  situacao: 'ativo' | 'admissao_prevista' | 'desligado';
  setorNome: string | null;
  turnoNome: string | null;
  turnoCodigo: string | null;
  liderSetor: boolean;
  avisoAtivo: boolean;
};

export type ColaboradorListaCriterio = {
  termo?: string;
  setor?: string;
  turno?: string;
  situacao?: string;
  aviso?: boolean;
  lider?: string;
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
    if (criterio.aviso && !item.avisoAtivo) return false;
    if (criterio.lider === 'sim' && !item.liderSetor) return false;
    if (criterio.lider === 'nao' && item.liderSetor) return false;
    const termo = this.normalizar(criterio.termo ?? '');
    if (!termo) return true;
    return this.normalizar(item.nome).includes(termo) || this.normalizar(item.codigo).includes(termo);
  }

  private normalizar(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR');
  }
}
