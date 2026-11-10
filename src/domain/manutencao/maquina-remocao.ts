export type MaquinaVinculos = {
  ordens: number;
  planos: number;
};

export type AvaliacaoRemocaoMaquina = {
  pode: boolean;
  vinculos: string[];
  mensagem: string;
};

export class MaquinaRemocao {
  avaliar(vinculos: MaquinaVinculos): AvaliacaoRemocaoMaquina {
    const lista = this.listar(vinculos);
    if (lista.length === 0) {
      return {
        pode: true,
        vinculos: [],
        mensagem: 'Pode remover a máquina.',
      };
    }
    return {
      pode: false,
      vinculos: lista,
      mensagem:
        'Não é possível remover esta máquina. Remova antes os vínculos listados para não quebrar o histórico.',
    };
  }

  private listar(vinculos: MaquinaVinculos): string[] {
    const itens: string[] = [];
    if (vinculos.ordens > 0) {
      itens.push(this.rotulo(vinculos.ordens, 'ordem de serviço', 'ordens de serviço'));
    }
    if (vinculos.planos > 0) {
      itens.push(this.rotulo(vinculos.planos, 'plano preventivo', 'planos preventivos'));
    }
    return itens;
  }

  private rotulo(quantidade: number, singular: string, plural: string): string {
    return `${quantidade} ${quantidade === 1 ? singular : plural}`;
  }
}
