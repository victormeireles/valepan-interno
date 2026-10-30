import { addCalendarDaysISO } from '@/lib/utils/date-utils';

export type FaltaJanelaEntrada = {
  classificacao: string;
  medida: string | null;
  cancelada: boolean;
};

export type FaltaJanelaContagem = {
  total: number;
  injustificadas: number;
  advertencia: number;
  suspensao: number;
  diasSuspensao: number;
};

export class FaltaJanelaResumo {
  static readonly dias = 90;

  periodo(hoje: string): { inicio: string; fim: string } {
    return { inicio: addCalendarDaysISO(hoje, -FaltaJanelaResumo.dias), fim: hoje };
  }

  contar(faltas: FaltaJanelaEntrada[]): FaltaJanelaContagem {
    const ativas = faltas.filter((falta) => !falta.cancelada);
    return {
      total: ativas.length,
      injustificadas: this.com(ativas, (falta) => falta.classificacao === 'injustificada'),
      advertencia: this.com(ativas, (falta) => falta.medida === 'advertencia'),
      suspensao: this.com(ativas, (falta) => falta.medida === 'suspensao'),
      diasSuspensao: this.com(ativas, (falta) => falta.classificacao === 'suspensao'),
    };
  }

  private com(faltas: FaltaJanelaEntrada[], aceita: (falta: FaltaJanelaEntrada) => boolean): number {
    return faltas.filter(aceita).length;
  }
}
