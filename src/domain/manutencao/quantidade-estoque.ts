const QUANTIDADE_TEXTO = /^\d+(\.\d{1,3})?$/;

export class QuantidadeEstoque {
  emMilesimos(texto: string): number | null {
    const normalizado = texto.trim().replace(/,/g, '.');
    if (!QUANTIDADE_TEXTO.test(normalizado)) return null;
    const milesimos = this.milesimosDe(normalizado);
    return milesimos > 0 ? milesimos : null;
  }

  formatar(milesimos: number): string {
    const negativo = milesimos < 0;
    const absoluto = Math.abs(milesimos);
    const inteiro = Math.trunc(absoluto / 1000);
    const fracao = String(absoluto % 1000)
      .padStart(3, '0')
      .replace(/0+$/, '');
    const texto = fracao ? `${inteiro},${fracao}` : String(inteiro);
    return negativo ? `-${texto}` : texto;
  }

  private milesimosDe(normalizado: string): number {
    const [inteiro, fracao = ''] = normalizado.split('.');
    return Number(inteiro) * 1000 + Number(fracao.padEnd(3, '0'));
  }
}
