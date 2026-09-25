export class CpfVerificador {
  verificar(digitos: string): boolean {
    if (!/^\d{11}$/.test(digitos) || /^(\d)\1{10}$/.test(digitos)) return false;
    return this.bate(digitos, 9) && this.bate(digitos, 10);
  }

  private bate(digitos: string, tamanho: number): boolean {
    let soma = 0;
    for (let i = 0; i < tamanho; i += 1) soma += Number(digitos[i]) * (tamanho + 1 - i);
    const resto = (soma * 10) % 11;
    return Number(digitos[tamanho]) === (resto === 10 ? 0 : resto);
  }
}
