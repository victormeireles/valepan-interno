import type { PainelEtapaTvFilaEtapa } from './painel-etapa-tv-fila-op';

export class PainelEtapaTvFilaCopy {
  static titulo(etapa: PainelEtapaTvFilaEtapa): string {
    return etapa === 'forno' ? 'Na câmara' : 'No resfriamento';
  }

  static prontoLabel(): string {
    return 'pronto';
  }

  /** Caption sob o volume pronto: "pronto · há 2 h". */
  static prontoComTempo(tempoLabel: string | null): string {
    if (!tempoLabel) return PainelEtapaTvFilaCopy.prontoLabel();
    return `${PainelEtapaTvFilaCopy.prontoLabel()} · ${tempoLabel}`;
  }

  static vindoLabel(): string {
    return 'vindo';
  }

  static feitoLabel(etapa: PainelEtapaTvFilaEtapa): string {
    return etapa === 'forno' ? 'assado' : 'embalado';
  }

  static emptyMessage(etapa: PainelEtapaTvFilaEtapa): string {
    return etapa === 'forno'
      ? 'Nada na câmara agora'
      : 'Nada no resfriamento agora';
  }
}
