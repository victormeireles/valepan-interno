import type { BadgeTone } from '@/components/ui/Badge';

export type InsumoCoberturaFaixa = 'indefinida' | 'urgente' | 'atencao' | 'ok' | 'folga';

export type InsumoCoberturaVisual = {
  faixa: InsumoCoberturaFaixa;
  tone: BadgeTone;
  label: string;
};

/**
 * Mapeia dias de cobertura para tom visual (texto + cor).
 * Faixas: ≤7 urgente, 8–21 atenção, 22–60 ok, >60 folga.
 */
export class InsumoCoberturaVisualTone {
  resolve(dias: number | null): InsumoCoberturaVisual {
    if (dias == null) {
      return { faixa: 'indefinida', tone: 'outline', label: 'Cobertura indefinida' };
    }
    if (dias <= 7) {
      return { faixa: 'urgente', tone: 'danger', label: `Cobertura urgente: ${dias} dias` };
    }
    if (dias <= 21) {
      return { faixa: 'atencao', tone: 'warning', label: `Cobertura em atenção: ${dias} dias` };
    }
    if (dias <= 60) {
      return { faixa: 'ok', tone: 'neutral', label: `Cobertura: ${dias} dias` };
    }
    return { faixa: 'folga', tone: 'success', label: `Cobertura folgada: ${dias} dias` };
  }

  findPicoColunaKeys(
    consumoPorSemana: Record<string, number>,
    pico: number,
  ): Set<string> {
    const keys = new Set<string>();
    if (pico <= 0) return keys;
    for (const [key, value] of Object.entries(consumoPorSemana)) {
      if (value === pico) keys.add(key);
    }
    return keys;
  }
}

export const insumoCoberturaVisualTone = new InsumoCoberturaVisualTone();
