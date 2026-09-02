import { emptyMatrizEtapas } from '@/domain/fluxo-processo/fluxo-matriz-horaria';
import { FLUXO_ASSADEIRA_SEM } from '@/domain/fluxo-processo/fluxo-processo-constants';
import type { FluxoEtapaKey, FluxoMatrizEtapas } from '@/domain/fluxo-processo/fluxo-processo-types';
import { addCalendarDaysISO, brazilClockUtcMs } from '@/lib/utils/date-utils';
import { controleVolumeOp } from './fluxo-controle-op-volume';
import { janelaPrevista } from './fluxo-controle-janela';
import type { FluxoControleOpInput } from './fluxo-controle-types';

const ETAPAS: FluxoEtapaKey[] = ['ferm', 'forno', 'emb'];

function horaLimites(dateISO: string, hour: number): { ini: number; fim: number } {
  const hh = String(hour).padStart(2, '0');
  const ini = brazilClockUtcMs(dateISO, `${hh}:00`);
  const fim =
    hour === 23
      ? brazilClockUtcMs(addCalendarDaysISO(dateISO, 1), '00:00')
      : brazilClockUtcMs(dateISO, `${String(hour + 1).padStart(2, '0')}:00`);
  return { ini, fim };
}

function overlapMs(aIni: number, aFim: number, bIni: number, bFim: number): number {
  return Math.max(0, Math.min(aFim, bFim) - Math.max(aIni, bIni));
}

export class FluxoPrevistoHora {
  rateioOpHora(
    op: FluxoControleOpInput,
    etapa: FluxoEtapaKey,
    dateISO: string,
    hour: number,
  ): number {
    const { ini, fim } = janelaPrevista(op, etapa);
    const unidades = controleVolumeOp(op, 'lt', etapa);
    const { ini: hIni, fim: hFim } = horaLimites(dateISO, hour);

    if (fim === ini) {
      return ini >= hIni && ini < hFim ? unidades : 0;
    }

    const overlap = overlapMs(ini, fim, hIni, hFim);
    if (overlap <= 0) return 0;
    return unidades * (overlap / (fim - ini));
  }

  buildMatriz(
    ops: FluxoControleOpInput[],
    ordemAss: string[],
    dateISO: string,
  ): FluxoMatrizEtapas {
    const matriz = emptyMatrizEtapas(ordemAss);

    for (const op of ops) {
      const ass = op.assadeiraNome?.trim() || FLUXO_ASSADEIRA_SEM;
      this.garantirAssadeira(matriz, ass);

      for (const etapa of ETAPAS) {
        for (let h = 0; h < 24; h++) {
          matriz[etapa][ass][h] += this.rateioOpHora(op, etapa, dateISO, h);
        }
      }
    }

    return matriz;
  }

  private garantirAssadeira(matriz: FluxoMatrizEtapas, ass: string): void {
    for (const etapa of ETAPAS) {
      if (!matriz[etapa][ass]) {
        matriz[etapa][ass] = Array.from({ length: 24 }, () => 0);
      }
    }
  }
}
