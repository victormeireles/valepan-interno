export class MaquinaCodigo {
  normalizar(valor: string): string {
    return valor.trim();
  }

  chave(valor: string): string {
    return this.normalizar(valor).toLocaleLowerCase('pt-BR');
  }
}
