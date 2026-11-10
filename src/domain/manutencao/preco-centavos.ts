const PRECO_TEXTO = /^\d+(,\d{1,2})?$/;

export class PrecoCentavos {
  parse(texto: string): number | null {
    if (!PRECO_TEXTO.test(texto)) return null;
    const [reais, fracao = ''] = texto.split(',');
    return Number(reais) * 100 + Number(fracao.padEnd(2, '0'));
  }

  formatar(centavos: number): string {
    const negativo = centavos < 0;
    const absoluto = Math.abs(centavos);
    const reais = Math.trunc(absoluto / 100);
    const fracao = String(absoluto % 100).padStart(2, '0');
    const texto = `${reais},${fracao}`;
    return negativo ? `-${texto}` : texto;
  }
}
