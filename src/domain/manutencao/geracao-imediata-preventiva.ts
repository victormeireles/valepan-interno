const SALVO = 'Plano salvo.';
const NA_FILA = 'Plano salvo. A ordem entrou na fila.';
const FALHA = 'Plano salvo. A ordem não entrou na fila.';

export class GeracaoImediataPreventiva {
  deveGerar(proximaEm: string, hoje: string): boolean {
    return this.data(proximaEm) <= this.data(hoje);
  }

  salvo(): string {
    return SALVO;
  }

  naFila(): string {
    return NA_FILA;
  }

  falha(): string {
    return FALHA;
  }

  private data(valor: string): string {
    return valor.slice(0, 10);
  }
}
