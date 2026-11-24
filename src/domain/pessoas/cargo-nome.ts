const PREPOSICOES = new Set(['de', 'da', 'do', 'dos', 'das', 'e']);
const ROMANOS = new Set(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']);
const LIMITE = 80;

export class CargoNome {
  formatar(texto: string): string {
    return texto
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((palavra, indice) => this.palavra(palavra, indice))
      .join(' ');
  }

  exigir(texto: string): string {
    const nome = this.formatar(texto);
    if (nome.length < 2) throw new Error('Informe o nome do cargo.');
    if (nome.length > LIMITE) throw new Error('Nome longo demais.');
    return nome;
  }

  private palavra(palavra: string, indice: number): string {
    const minuscula = palavra.toLocaleLowerCase('pt-BR');
    const maiuscula = minuscula.toLocaleUpperCase('pt-BR');
    if (ROMANOS.has(maiuscula)) return maiuscula;
    if (indice > 0 && PREPOSICOES.has(minuscula)) return minuscula;
    return minuscula.charAt(0).toLocaleUpperCase('pt-BR') + minuscula.slice(1);
  }
}

export class CargoNomeUnico {
  repetido(existentes: { id: string; nome: string }[], nome: string, proprioId?: string): boolean {
    const alvo = nome.toLocaleLowerCase('pt-BR');
    return existentes.some(
      (item) => item.id !== proprioId && item.nome.toLocaleLowerCase('pt-BR') === alvo,
    );
  }
}
