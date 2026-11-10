export type OrdemVinculos = {
  pecasUsadas: number;
  movimentosEstoque: number;
};

export type AvaliacaoRemocaoOrdem = {
  pode: boolean;
  vinculos: string[];
  mensagem: string;
};

export class OrdemRemocao {
  avaliar(vinculos: OrdemVinculos): AvaliacaoRemocaoOrdem {
    const lista = this.listar(vinculos);
    if (lista.length === 0) {
      return {
        pode: true,
        vinculos: [],
        mensagem: 'Pode remover a ordem.',
      };
    }
    return {
      pode: false,
      vinculos: lista,
      mensagem:
        'Não é possível remover esta ordem. Remova antes os vínculos listados para não quebrar o histórico.',
    };
  }

  private listar(vinculos: OrdemVinculos): string[] {
    const itens: string[] = [];
    if (vinculos.pecasUsadas > 0) {
      itens.push(this.rotulo(vinculos.pecasUsadas, 'peça usada na OS', 'peças usadas na OS'));
    }
    if (vinculos.movimentosEstoque > 0) {
      itens.push(
        this.rotulo(
          vinculos.movimentosEstoque,
          'movimento de estoque',
          'movimentos de estoque',
        ),
      );
    }
    return itens;
  }

  private rotulo(quantidade: number, singular: string, plural: string): string {
    return `${quantidade} ${quantidade === 1 ? singular : plural}`;
  }
}
