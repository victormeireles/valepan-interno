export type AvaliacaoRemocaoOrdem = {
  pode: boolean;
  vinculos: string[];
  mensagem: string;
};

export class OrdemRemocao {
  avaliar(): AvaliacaoRemocaoOrdem {
    return {
      pode: true,
      vinculos: [],
      mensagem: 'Pode remover a ordem. Peças usadas voltam ao estoque.',
    };
  }
}
