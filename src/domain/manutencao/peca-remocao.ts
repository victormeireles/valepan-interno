export type PecaVinculos = {
  usosEmOrdens: number;
};

export type AvaliacaoRemocao = {
  pode: boolean;
  vinculos: string[];
  mensagem: string;
};

export class PecaRemocao {
  avaliar(vinculos: PecaVinculos): AvaliacaoRemocao {
    if (vinculos.usosEmOrdens <= 0) {
      return {
        pode: true,
        vinculos: [],
        mensagem: 'Pode remover a peça.',
      };
    }
    return {
      pode: false,
      vinculos: [
        this.rotulo(vinculos.usosEmOrdens, 'uso em ordem', 'usos em ordens'),
      ],
      mensagem:
        'Não é possível remover esta peça. Remova antes os vínculos listados para não quebrar o histórico.',
    };
  }

  private rotulo(quantidade: number, singular: string, plural: string): string {
    return `${quantidade} ${quantidade === 1 ? singular : plural}`;
  }
}
