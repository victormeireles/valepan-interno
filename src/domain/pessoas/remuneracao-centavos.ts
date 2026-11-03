const COM_PONTO = /^\d{1,3}(\.\d{3})*(,\d{1,2})?$/;
const SEM_PONTO = /^\d+(,\d{1,2})?$/;

export const REMUNERACAO_CENTAVOS_MAXIMO = 2_147_483_647;

export class RemuneracaoCentavos {
  interpretar(valor: string | undefined, invalido: string, alto: string): number {
    const texto = (valor ?? '').trim();
    if (!this.aceito(texto)) throw new Error(invalido);
    return this.centavos(texto, alto);
  }

  formatar(centavos: number): string {
    return `R$ ${this.digitar(centavos)}`;
  }

  digitar(centavos: number): string {
    const reais = Math.trunc(centavos / 100);
    const frac = String(Math.abs(centavos % 100)).padStart(2, '0');
    const grupos = String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${grupos},${frac}`;
  }

  private aceito(texto: string): boolean {
    if (!texto) return false;
    const regra = texto.includes('.') ? COM_PONTO : SEM_PONTO;
    return regra.test(texto);
  }

  private centavos(texto: string, alto: string): number {
    const [reais, frac = ''] = texto.replace(/\./g, '').split(',');
    const total = BigInt(reais) * BigInt(100) + BigInt((frac + '00').slice(0, 2));
    if (total > BigInt(REMUNERACAO_CENTAVOS_MAXIMO)) throw new Error(alto);
    return Number(total);
  }
}
