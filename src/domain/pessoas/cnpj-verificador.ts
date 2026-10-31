const PESOS_PRIMEIRO_DIGITO = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_SEGUNDO_DIGITO = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

export class CnpjVerificador {
  verificar(digitos: string): boolean {
    if (!/^\d{14}$/.test(digitos)) return false;
    if (/^(\d)\1{13}$/.test(digitos)) return false;
    const numeros = digitos.split('').map(Number);
    const primeiro = this.digito(numeros.slice(0, 12), PESOS_PRIMEIRO_DIGITO);
    const segundo = this.digito(numeros.slice(0, 13), PESOS_SEGUNDO_DIGITO);
    return numeros[12] === primeiro && numeros[13] === segundo;
  }

  private digito(base: number[], pesos: number[]): number {
    const soma = base.reduce((total, numero, indice) => total + numero * pesos[indice], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  }
}
