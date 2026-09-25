export type HorarioCelula = {
  inicio: string | null;
  fim: string | null;
  terminaDiaSeguinte: boolean;
  situacao: 'definido' | 'nao_trabalha' | 'a_confirmar' | 'invalido';
};

const INTERVALO =
  /^(\d{2}:\d{2})\s*[-–]\s*(\d{2}:\d{2})(?:\s*\(\+1\s*dia\))?$/i;

export class HorarioDiaParser {
  parseCelula(celula: string): HorarioCelula {
    const texto = this.limpar(celula);

    if (texto.length === 0 || texto === 'a confirmar') {
      return this.vazio('a_confirmar');
    }

    if (texto === 'não trabalha' || texto === 'nao trabalha') {
      return this.vazio('nao_trabalha');
    }

    const match = INTERVALO.exec(texto);
    if (!match) {
      return this.vazio('invalido');
    }

    return {
      inicio: match[1],
      fim: match[2],
      terminaDiaSeguinte: /\(\+1\s*dia\)/i.test(texto),
      situacao: 'definido',
    };
  }

  private limpar(celula: string): string {
    return celula
      .trim()
      .replace(/\*+/g, '')
      .trim()
      .toLocaleLowerCase('pt-BR');
  }

  private vazio(situacao: 'nao_trabalha' | 'a_confirmar' | 'invalido'): HorarioCelula {
    return { inicio: null, fim: null, terminaDiaSeguinte: false, situacao };
  }
}
