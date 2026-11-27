export type DiaFalta = {
  data: string;
  dataDesligamento: string | null;
};

export class FaltaDiaContavel {
  aplicar<T extends DiaFalta>(itens: T[]): T[] {
    return itens.filter((item) => this.conta(item));
  }

  conta(item: DiaFalta): boolean {
    if (!item.dataDesligamento) return true;
    return item.data < item.dataDesligamento;
  }
}
