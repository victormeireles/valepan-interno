import { etiquetaFilaService } from '@/lib/services/etiqueta-fila-service';
import { ordensProducaoPainelService } from '@/lib/services/ordens-producao-painel-service';
import { getTodayISOInBrazilTimezone } from '@/lib/utils/date-utils';

export interface HubStats {
  ordensHoje: number;
  etiquetasPendentes: number;
}

export async function getHubStats(): Promise<HubStats> {
  const today = getTodayISOInBrazilTimezone();

  try {
    const [ordens, fila] = await Promise.all([
      ordensProducaoPainelService.getListForDate(today),
      etiquetaFilaService.getFilaForDate(today),
    ]);

    return {
      ordensHoje: ordens.resumo.totalOrdens,
      etiquetasPendentes: fila.pendentes.length,
    };
  } catch {
    return { ordensHoje: 0, etiquetasPendentes: 0 };
  }
}
