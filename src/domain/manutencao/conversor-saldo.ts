export class ConversorSaldo {
  emMilesimos(valor: string | number): number {
    const texto = String(valor).trim();
    const negativo = texto.startsWith('-');
    const absoluto = negativo ? texto.slice(1) : texto;
    const [inteiroTexto, fracaoTexto = ''] = absoluto.split('.');
    const inteiro = Number(inteiroTexto || '0');
    const fracao = Number(fracaoTexto.padEnd(3, '0').slice(0, 3) || '0');
    return (negativo ? -1 : 1) * (inteiro * 1000 + fracao);
  }

  numerico(milesimos: number): string {
    const negativo = milesimos < 0;
    const absoluto = Math.abs(milesimos);
    const inteiro = Math.trunc(absoluto / 1000);
    const fracao = String(absoluto % 1000).padStart(3, '0');
    const texto = `${inteiro}.${fracao}`;
    return negativo ? `-${texto}` : texto;
  }
}
