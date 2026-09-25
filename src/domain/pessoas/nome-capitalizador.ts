const PREPOSICOES = new Set(['de', 'da', 'do', 'dos', 'das', 'e']);
const SIGLAS = new Set(['RH', 'CPF', 'CEP', 'RJ']);

export class NomeCapitalizador {
  formatar(texto: string): string {
    return texto
      .trim()
      .split(/\s+/)
      .map((palavra, indice) => this.formatarPalavra(palavra, indice))
      .join(' ');
  }

  private formatarPalavra(palavra: string, indice: number): string {
    const minuscula = palavra.toLocaleLowerCase('pt-BR');
    if (indice > 0 && PREPOSICOES.has(minuscula)) return minuscula;

    const maiuscula = minuscula.toLocaleUpperCase('pt-BR');
    if (SIGLAS.has(maiuscula)) return maiuscula;

    return minuscula.charAt(0).toLocaleUpperCase('pt-BR') + minuscula.slice(1);
  }
}
