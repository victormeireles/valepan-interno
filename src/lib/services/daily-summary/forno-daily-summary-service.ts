import type { EtapaQuantidade } from '@/domain/producao-etapa/etapa-quantidade';
import type { PainelOrdemEtapa } from '@/domain/types/painel-etapa';
import { getProductionStatus } from '@/domain/types/realizado';
import { painelFornoService } from '@/lib/services/painel-forno-service';

import {
  BaseDailySummaryService,
  ItemQuantityInfo,
  QuantityByUnit,
  StageSummaryResult,
} from './base-daily-summary-service';

interface FornoParsedRow {
  produto: string;
  unit: 'lt' | 'un';
  meta: number;
  produzido: number;
  metaBreakdown: QuantityByUnit;
}

function etapaQuantidadeToBreakdown(qty: EtapaQuantidade): QuantityByUnit {
  const breakdown: QuantityByUnit = {};
  if (qty.assadeiras > 0) breakdown.lt = qty.assadeiras;
  if (qty.unidades > 0) breakdown.un = qty.unidades;
  return breakdown;
}

export class FornoDailySummaryService extends BaseDailySummaryService {
  protected stage = 'forno';

  protected async loadRows(date: string): Promise<string[][]> {
    void date;
    return [];
  }

  async build(date: string): Promise<StageSummaryResult> {
    const { ordens } = await painelFornoService.getPainelForDate(date);
    return this.buildSummaryFromOrdens(date, ordens);
  }

  protected buildSummary(date: string, rows: string[][]): StageSummaryResult {
    void rows;
    return this.buildSummaryFromOrdens(date, []);
  }

  protected buildSummaryFromOrdens(
    date: string,
    ordens: PainelOrdemEtapa[],
  ): StageSummaryResult {
    const completeTotals = this.createEmptyTotals();
    const partialTotals = this.createEmptyTotals();
    const notProducedTotals = this.createEmptyTotals();
    const highlighted: ItemQuantityInfo[] = [];

    ordens.forEach((ordem) => {
      const parsed = this.parseOrdem(ordem);
      if (!parsed) return;

      const status = getProductionStatus(parsed.produzido, parsed.meta);

      switch (status) {
        case 'complete': {
          completeTotals.itemCount += 1;
          this.addToQuantity(
            completeTotals.produced,
            parsed.unit,
            parsed.produzido,
          );
          break;
        }
        case 'partial': {
          partialTotals.itemCount += 1;
          this.addToQuantity(
            partialTotals.produced,
            parsed.unit,
            parsed.produzido,
          );
          this.addToQuantity(partialTotals.meta!, parsed.unit, parsed.meta);
          break;
        }
        case 'not-started': {
          notProducedTotals.itemCount += 1;
          this.addToQuantity(notProducedTotals.meta!, parsed.unit, parsed.meta);
          if (highlighted.length < 3) {
            highlighted.push({
              produto: parsed.produto,
              quantity: parsed.metaBreakdown,
            });
          }
          break;
        }
        default:
          break;
      }
    });

    return {
      date,
      totals: {
        complete: completeTotals,
        partial: partialTotals,
        notProduced: {
          itemCount: notProducedTotals.itemCount,
          meta: notProducedTotals.meta!,
          highlighted,
        },
      },
    };
  }

  private parseOrdem(ordem: PainelOrdemEtapa): FornoParsedRow | null {
    const produto = ordem.produto.trim();
    if (!produto || ordem.aProduzir <= 0) return null;

    return {
      produto,
      unit: ordem.unidade,
      meta: ordem.aProduzir,
      produzido: ordem.produzido,
      metaBreakdown: etapaQuantidadeToBreakdown(ordem.pedido),
    };
  }
}

export const fornoDailySummaryService = new FornoDailySummaryService();
