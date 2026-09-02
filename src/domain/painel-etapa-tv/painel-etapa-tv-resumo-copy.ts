import { formatJanelaClockLabel } from '@/domain/painel-producao/painel-producao-time';
import type { PainelEtapaTvTurnoFatia } from './painel-etapa-tv-turnos-resumo';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export class PainelEtapaTvResumoCopy {
  static ddMm(isoDate: string): string {
    const match = isoDate.match(ISO_DATE);
    if (!match) return isoDate;
    return `${match[3]}/${match[2]}`;
  }

  static t1Label(t1Inicio: string): string {
    const clock = formatJanelaClockLabel(t1Inicio);
    return `${clock}–${clock}`;
  }

  static fatiaLabel(fatia: PainelEtapaTvTurnoFatia): string {
    const inicio = formatJanelaClockLabel(fatia.inicio);
    const fim = formatJanelaClockLabel(fatia.fim);
    return `T${fatia.numero} ${inicio}–${fim}`;
  }

  static outraOpLine(volume: number, outraOpData: string | null): string | null {
    if (volume <= 0) return null;
    const qty = volume.toLocaleString('pt-BR');
    const ddMm = outraOpData ? this.ddMm(outraOpData) : null;
    return ddMm ? `${qty} de OP ${ddMm}` : `${qty} de outra OP`;
  }
}
