import { addCalendarDaysISO, formatISODateBrNoYear } from '@/lib/utils/date-utils';

export type EstadoFerias = 'cancelada' | 'programada' | 'em_gozo' | 'encerrada';

export type PeriodoFerias = {
  inicio: string;
  volta: string;
  canceladaEm?: string | null;
};

export class FeriasPeriodo {
  estado(periodo: PeriodoFerias, hoje: string): EstadoFerias {
    if (periodo.canceladaEm) return 'cancelada';
    if (hoje < periodo.inicio) return 'programada';
    if (hoje < periodo.volta) return 'em_gozo';
    return 'encerrada';
  }

  aberto(periodo: PeriodoFerias, hoje: string): boolean {
    const estado = this.estado(periodo, hoje);
    return estado === 'programada' || estado === 'em_gozo';
  }

  cobre(periodo: PeriodoFerias, data: string): boolean {
    if (periodo.canceladaEm) return false;
    return data >= periodo.inicio && data < periodo.volta;
  }

  selo(periodo: PeriodoFerias): string {
    const { inicio, fim, umDia } = this.janela(periodo);
    return umDia ? `Férias ${inicio}` : `Férias ${inicio}–${fim}`;
  }

  frase(periodo: PeriodoFerias): string {
    const { inicio, fim, umDia } = this.janela(periodo);
    return umDia ? inicio : `${inicio} a ${fim}`;
  }

  private janela(periodo: PeriodoFerias): { inicio: string; fim: string; umDia: boolean } {
    const inicio = formatISODateBrNoYear(periodo.inicio);
    const fim = formatISODateBrNoYear(addCalendarDaysISO(periodo.volta, -1));
    return { inicio, fim, umDia: inicio === fim };
  }
}
