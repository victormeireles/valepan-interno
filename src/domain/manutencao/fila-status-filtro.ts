export type FilaStatusFiltroId = 'abertas' | 'finalizadas';

export type ItemComStatusFila = {
  status: 'aberta' | 'recebida' | 'finalizada';
};

export class FilaStatusFiltro {
  aplicar<T extends ItemComStatusFila>(itens: T[], filtro: FilaStatusFiltroId): T[] {
    return itens.filter((item) => this.bate(item.status, filtro));
  }

  contar(itens: ItemComStatusFila[]): Record<FilaStatusFiltroId, number> {
    return {
      abertas: this.aplicar(itens, 'abertas').length,
      finalizadas: this.aplicar(itens, 'finalizadas').length,
    };
  }

  private bate(status: ItemComStatusFila['status'], filtro: FilaStatusFiltroId): boolean {
    if (filtro === 'abertas') return status === 'aberta' || status === 'recebida';
    return status === 'finalizada';
  }
}
