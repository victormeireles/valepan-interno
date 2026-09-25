export type ColaboradorListaItem = {
  codigo: string;
  nome: string;
  situacao: 'ativo' | 'admissao_prevista' | 'desligado';
  setorNome: string | null;
  turnoNome: string | null;
};

export class ColaboradorListaFiltro {
  aplicar(itens: ColaboradorListaItem[], termo: string): ColaboradorListaItem[] {
    const normalizado = this.normalizar(termo);
    if (!normalizado) return itens;

    return itens.filter(
      (item) =>
        this.normalizar(item.nome).includes(normalizado) ||
        this.normalizar(item.codigo).includes(normalizado),
    );
  }

  private normalizar(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR');
  }
}
