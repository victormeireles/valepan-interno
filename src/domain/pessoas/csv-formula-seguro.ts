export class CsvFormulaSeguro {
  celula(valor: string): string {
    const texto = valor.replaceAll('"', '""');
    const protegido = /^[=+\-@]/.test(texto) ? `'${texto}` : texto;
    return `"${protegido}"`;
  }

  linha(valores: string[]): string {
    return valores.map((valor) => this.celula(valor)).join(';');
  }
}
