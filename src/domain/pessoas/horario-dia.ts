export type HorarioCelula = {
  inicio: string | null;
  fim: string | null;
  terminaDiaSeguinte: boolean;
  situacao: 'definido' | 'nao_trabalha' | 'a_confirmar';
};

const INTERVALO =
  /^(\d{2}:\d{2})\s*[-–]\s*(\d{2}:\d{2})(?:\s*\(\+1\s*dia\))?$/i;

export class HorarioDiaParser {
  parseCelula(celula: string): HorarioCelula {
    const texto = celula.trim().replace(/^\*+|\*+$/g, '').trim().toLocaleLowerCase('pt-BR');

    if (texto === 'não trabalha' || texto === 'nao trabalha') {
      return { inicio: null, fim: null, terminaDiaSeguinte: false, situacao: 'nao_trabalha' };
    }

    if (texto === 'a confirmar') {
      return { inicio: null, fim: null, terminaDiaSeguinte: false, situacao: 'a_confirmar' };
    }

    const original = celula.trim();
    const match = INTERVALO.exec(original);
    if (!match) {
      return { inicio: null, fim: null, terminaDiaSeguinte: false, situacao: 'a_confirmar' };
    }

    return {
      inicio: match[1],
      fim: match[2],
      terminaDiaSeguinte: /\(\+1\s*dia\)/i.test(original),
      situacao: 'definido',
    };
  }
}
