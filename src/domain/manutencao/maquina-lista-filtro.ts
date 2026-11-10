import type { MaquinaItem } from '@/app/actions/manutencao-maquina-actions';

export class MaquinaListaFiltro {
  aplicar(maquinas: MaquinaItem[], termo: string): MaquinaItem[] {
    const busca = this.normalizar(termo);
    if (!busca) return maquinas;
    return maquinas.filter((maquina) => this.bate(maquina, busca));
  }

  private bate(maquina: MaquinaItem, busca: string): boolean {
    return [maquina.codigo, maquina.nome, maquina.setorNome, maquina.observacao].some((campo) =>
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
