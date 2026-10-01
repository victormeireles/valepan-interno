import { addCalendarDaysISO, formatISODateBr } from '@/lib/utils/date-utils';

export type ClassificacaoFalta = 'pendente' | 'justificada' | 'injustificada';

export type FaltaLinha = {
  colaboradorCodigo: string;
  data: string;
  classificacao: ClassificacaoFalta;
  justificativa: string | null;
};

export type FaltaSeparada = {
  livres: string[];
  repetidas: string[];
};

const ISO_DATA = /^(\d{4})-(\d{2})-(\d{2})$/;

export class FaltaLancamento {
  static readonly limiteDias = 62;

  validar(falta: FaltaLinha, datasOcupadas: string[]): FaltaLinha {
    if (!this.calendario(falta.data)) throw new Error('Informe a data da falta.');
    if (datasOcupadas.includes(falta.data)) throw new Error('Já existe falta ativa nessa data.');
    return falta;
  }

  periodo(inicio: string, fim: string): string[] {
    if (!this.calendario(inicio) || !this.calendario(fim) || inicio > fim) {
      throw new Error('O período da falta é inválido.');
    }
    const datas: string[] = [];
    let cursor = inicio;
    while (cursor <= fim) {
      if (datas.length === FaltaLancamento.limiteDias) {
        throw new Error(`O período pode ter no máximo ${FaltaLancamento.limiteDias} dias.`);
      }
      datas.push(cursor);
      cursor = addCalendarDaysISO(cursor, 1);
    }
    return datas;
  }

  normalizar(datas: string[]): string[] {
    const unicas = [...new Set(datas.filter(Boolean))].sort();
    if (unicas.length === 0) throw new Error('Selecione ao menos um dia.');
    if (unicas.length > FaltaLancamento.limiteDias) {
      throw new Error(`O período pode ter no máximo ${FaltaLancamento.limiteDias} dias.`);
    }
    if (unicas.some((data) => !this.calendario(data))) throw new Error('Informe a data da falta.');
    return unicas;
  }

  separar(pedidas: string[], ocupadas: string[]): FaltaSeparada {
    return {
      livres: pedidas.filter((data) => !ocupadas.includes(data)),
      repetidas: pedidas.filter((data) => ocupadas.includes(data)),
    };
  }

  mensagem(livres: number, repetidas: string[]): string {
    if (livres === 0) return `Já existe falta em ${this.juntar(repetidas)}.`;
    const base = livres === 1 ? 'Falta registrada.' : `${livres.toLocaleString('pt-BR')} faltas registradas.`;
    if (repetidas.length === 0) return base;
    const verbo = repetidas.length === 1 ? 'já tinha falta.' : 'já tinham falta.';
    return `${base} ${this.juntar(repetidas)} ${verbo}`;
  }

  private juntar(datas: string[]): string {
    const rotulos = datas.map((data) => formatISODateBr(data));
    if (rotulos.length <= 1) return rotulos[0] ?? '';
    const ultimo = rotulos[rotulos.length - 1];
    return `${rotulos.slice(0, -1).join(', ')} e ${ultimo}`;
  }

  private calendario(iso: string): boolean {
    const match = ISO_DATA.exec(iso);
    if (!match) return false;
    const ano = Number(match[1]);
    const mes = Number(match[2]);
    const dia = Number(match[3]);
    const data = new Date(Date.UTC(ano, mes - 1, dia));
    return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
  }
}
