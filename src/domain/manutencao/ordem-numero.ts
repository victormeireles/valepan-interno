const PREFIXO = 'OS-';
const LARGURA_MINIMA = 5;
const TEXTO_ORDEM = /^OS-(\d+)$/;

export class OrdemNumero {
  formatar(numero: number): string {
    const corpo = String(numero).padStart(LARGURA_MINIMA, '0');
    return `${PREFIXO}${corpo}`;
  }

  parse(texto: string): number | null {
    const encontrado = TEXTO_ORDEM.exec(texto);
    if (!encontrado?.[1]) return null;
    return Number(encontrado[1]);
  }
}
