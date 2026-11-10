export type PlanoVinculos = {
  ordens: number;
};

export type AvaliacaoRemocaoPlano = {
  pode: boolean;
  vinculos: string[];
  mensagem: string;
};

export class PlanoRemocao {
  avaliar(vinculos: PlanoVinculos): AvaliacaoRemocaoPlano {
    const lista = this.listar(vinculos);
    if (lista.length === 0) {
      return {
        pode: true,
        vinculos: [],
        mensagem: 'Pode remover o plano.',
      };
    }
    return {
      pode: false,
      vinculos: lista,
      mensagem:
        'Não é possível remover este plano. Remova antes os vínculos listados para não quebrar o histórico.',
    };
  }

  private listar(vinculos: PlanoVinculos): string[] {
    if (vinculos.ordens <= 0) return [];
    return [this.rotulo(vinculos.ordens, 'ordem de serviço', 'ordens de serviço')];
  }

  private rotulo(quantidade: number, singular: string, plural: string): string {
    return `${quantidade} ${quantidade === 1 ? singular : plural}`;
  }
}
