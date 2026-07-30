export type InsumoConsumoVisualizacao = 'semanal' | 'diaria';

export type InsumoConsumoPeriodoColuna = {
  inicio: string;
  fim: string;
  label: string;
};

export type InsumoConsumoPeriodo = {
  dataInicio: string;
  dataFim: string;
  visualizacao: InsumoConsumoVisualizacao;
  colunas: InsumoConsumoPeriodoColuna[];
};

const SAO_PAULO_TIME_ZONE = 'America/Sao_Paulo';
const DEFAULT_CLOSED_WEEKS = 4;
const WEEK_LENGTH_DAYS = 7;
const DAILY_DEFAULT_START_OFFSET_DAYS = -7;
const DAILY_DEFAULT_END_OFFSET_DAYS = -1;

export class InsumoConsumoSemanalPeriodoBuilder {
  buildDefault(
    anchorDate = new Date(),
    visualizacao: InsumoConsumoVisualizacao = 'semanal',
  ): InsumoConsumoPeriodo {
    const hoje = this.parseIsoDate(this.toSaoPauloIsoDate(anchorDate));
    if (visualizacao === 'diaria') {
      const dataInicio = this.addDays(hoje, DAILY_DEFAULT_START_OFFSET_DAYS);
      const dataFim = this.addDays(hoje, DAILY_DEFAULT_END_OFFSET_DAYS);

      return this.buildFromRange(
        this.formatIsoDate(dataInicio),
        this.formatIsoDate(dataFim),
        visualizacao,
      );
    }

    const domingoAtual = this.startOfWeek(hoje);
    const dataFim = this.addDays(domingoAtual, -1); // sábado da semana anterior
    const dataInicio = this.addDays(domingoAtual, -DEFAULT_CLOSED_WEEKS * WEEK_LENGTH_DAYS);

    return this.buildFromRange(
      this.formatIsoDate(dataInicio),
      this.formatIsoDate(dataFim),
      visualizacao,
    );
  }

  buildFromRange(
    dataInicio: string,
    dataFim: string,
    visualizacao: InsumoConsumoVisualizacao = 'semanal',
  ): InsumoConsumoPeriodo {
    const inicio = this.parseIsoDate(dataInicio);
    const fim = this.parseIsoDate(dataFim);

    if (inicio.getTime() > fim.getTime()) {
      throw new Error('Data inicial deve ser anterior ou igual à data final');
    }

    const colunas =
      visualizacao === 'diaria'
        ? this.buildDailyColumns(inicio, fim)
        : this.buildWeeklyColumns(inicio, fim);

    return { dataInicio, dataFim, visualizacao, colunas };
  }

  getColumnStartIsoDate(visualizacao: InsumoConsumoVisualizacao, data: string): string {
    if (visualizacao === 'diaria') return data;
    return this.formatIsoDate(this.startOfWeek(this.parseIsoDate(data)));
  }

  getSaoPauloDayRange(dataInicio: string, dataFim: string): { startIso: string; endIso: string } {
    const startIso = `${dataInicio}T00:00:00-03:00`;
    const endIso = `${this.formatIsoDate(this.addDays(this.parseIsoDate(dataFim), 1))}T00:00:00-03:00`;

    return {
      startIso: new Date(startIso).toISOString(),
      endIso: new Date(endIso).toISOString(),
    };
  }

  getSaoPauloDateFromTimestamp(value: string): string {
    return this.toSaoPauloIsoDate(new Date(value));
  }

  private buildWeeklyColumns(
    inicio: Date,
    fim: Date,
  ): InsumoConsumoPeriodoColuna[] {
    const primeiraSemana = this.startOfWeek(inicio);
    const ultimaSemana = this.startOfWeek(fim);
    const colunas: InsumoConsumoPeriodoColuna[] = [];

    for (
      let cursor = primeiraSemana;
      cursor.getTime() <= ultimaSemana.getTime();
      cursor = this.addDays(cursor, WEEK_LENGTH_DAYS)
    ) {
      const semanaFim = this.addDays(cursor, WEEK_LENGTH_DAYS - 1);
      colunas.push({
        inicio: this.formatIsoDate(cursor),
        fim: this.formatIsoDate(semanaFim),
        label: `${this.formatShortDate(cursor)} a ${this.formatShortDate(semanaFim)}`,
      });
    }

    return colunas;
  }

  private buildDailyColumns(inicio: Date, fim: Date): InsumoConsumoPeriodoColuna[] {
    const colunas: InsumoConsumoPeriodoColuna[] = [];

    for (
      let cursor = inicio;
      cursor.getTime() <= fim.getTime();
      cursor = this.addDays(cursor, 1)
    ) {
      const isoDate = this.formatIsoDate(cursor);
      colunas.push({
        inicio: isoDate,
        fim: isoDate,
        label: this.formatShortDate(cursor),
      });
    }

    return colunas;
  }

  private toSaoPauloIsoDate(date: Date): string {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: SAO_PAULO_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);

    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;

    return `${year}-${month}-${day}`;
  }

  private startOfWeek(date: Date): Date {
    return this.addDays(date, -date.getUTCDay());
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date.getTime());
    next.setUTCDate(next.getUTCDate() + days);
    return next;
  }

  private parseIsoDate(value: string): Date {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private formatIsoDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private formatShortDate(date: Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'UTC',
      day: '2-digit',
      month: '2-digit',
    }).format(date);
  }
}

export const insumoConsumoSemanalPeriodoBuilder =
  new InsumoConsumoSemanalPeriodoBuilder();
