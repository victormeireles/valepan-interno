export class EtapaContinuidadeCopy {
  static formatQtd(valor: number, unidade: string): string {
    return `${valor.toLocaleString('pt-BR')} ${unidade}`;
  }

  static tituloFinalizarAbaixo(): string {
    return 'Quantidade abaixo da ordem';
  }

  static mensagemFinalizarAbaixo(): string {
    return 'A quantidade lançada ficou abaixo da ordem de produção. Ao finalizar, o pedido não será produzido por completo.';
  }

  static confirmarFinalizarAbaixo(naoProduzido: number, unidade: string): string {
    return `Sim, finalizar com ${this.formatQtd(naoProduzido, unidade)} a menos`;
  }

  static tituloContinuar(): string {
    return 'Continuar produzindo?';
  }

  static mensagemContinuar(): string {
    return 'O total projetado já atingiu a referência. Confirme apenas se realmente houver mais produção para lançar.';
  }

  static confirmarContinuar(): string {
    return 'Sim, confirmo que ainda vou produzir mais';
  }

  static labelLancado(): string {
    return 'Lançado';
  }

  static labelOrdem(): string {
    return 'Ordem';
  }

  static labelNaoProduzido(): string {
    return 'Não produzido';
  }
}
