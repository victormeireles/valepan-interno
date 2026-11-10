import type { PecaItem } from '@/app/manutencao/manutencao-peca-consulta';

export class PecaListaFiltro {
  aplicar(pecas: PecaItem[], termo: string): PecaItem[] {
    const busca = this.normalizar(termo);
    if (!busca) return pecas;
    return pecas.filter((peca) => this.bate(peca, busca));
  }

  private bate(peca: PecaItem, busca: string): boolean {
    return [peca.codigo, peca.nome, peca.unidade].some((campo) =>
      this.normalizar(campo).includes(busca),
    );
  }

  private normalizar(valor: string): string {
    return valor
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR')
      .trim();
  }
}
