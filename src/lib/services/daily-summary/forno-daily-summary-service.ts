import { PEDIDOS_FORNO_CONFIG } from "@/config/forno";
import { getProductionStatus } from "@/domain/types/realizado";

import {
  BaseDailySummaryService,
  ItemQuantityInfo,
  QuantityByUnit,
  StageSummaryResult,
} from "./base-daily-summary-service";

type FornoRow = string[];

interface FornoParsedRow {
  produto: string;
  unit: "lt" | "un" | "kg";
  meta: number;
  produzido: number;
  metaBreakdown: QuantityByUnit;
}

export class FornoDailySummaryService extends BaseDailySummaryService {
  protected stage = "forno";

  protected async loadRows(): Promise<string[][]> {
    const { spreadsheetId, tabName } = PEDIDOS_FORNO_CONFIG.destinoPedidos;
    const rows = await this.readSheet(spreadsheetId, `${tabName}!A:N`);
    return rows.slice(1);
  }

  async build(date: string): Promise<StageSummaryResult> {
    const rows = await this.loadRows();
    return this.buildSummary(date, rows);
  }

  protected buildSummary(
    date: string,
    rows: FornoRow[],
  ): StageSummaryResult {
    const completeTotals = this.createEmptyTotals();
    const partialTotals = this.createEmptyTotals();
    const notProducedTotals = this.createEmptyTotals();
    const highlighted: ItemQuantityInfo[] = [];

    rows.forEach((row) => {
      const dataProducao = this.normalizeDate(row[0]);
      if (dataProducao !== date) return;

      const parsed = this.parseRow(row);
      if (!parsed) return;

      const status = getProductionStatus(parsed.produzido, parsed.meta);

      switch (status) {
        case "complete": {
          completeTotals.itemCount += 1;
          this.addToQuantity(
            completeTotals.produced,
            parsed.unit,
            parsed.produzido,
          );
          break;
        }
        case "partial": {
          partialTotals.itemCount += 1;
          this.addToQuantity(
            partialTotals.produced,
            parsed.unit,
            parsed.produzido,
          );
          this.addToQuantity(partialTotals.meta!, parsed.unit, parsed.meta);
          break;
        }
        case "not-started": {
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

  private parseRow(row: FornoRow): FornoParsedRow | null {
    const produto = (row[1] || "").toString().trim();
    if (!produto) return null;

    const metaLatas = Number(row[2] || 0);
    const metaUnidades = Number(row[3] || 0);
    const metaKg = Number(row[4] || 0);

    const prodLatas = Number(row[7] || 0);
    const prodUnidades = Number(row[8] || 0);
    const prodKg = Number(row[9] || 0);

    const metaBreakdown: QuantityByUnit = {};
    if (metaLatas > 0) metaBreakdown.lt = metaLatas;
    if (metaUnidades > 0) metaBreakdown.un = metaUnidades;
    if (metaKg > 0) metaBreakdown.kg = metaKg;

    let unit: "lt" | "un" | "kg" | null = null;
    let meta = 0;
    let produzido = 0;

    if (metaLatas > 0) {
      unit = "lt";
      meta = metaLatas;
      produzido = prodLatas;
    } else if (metaUnidades > 0) {
      unit = "un";
      meta = metaUnidades;
      produzido = prodUnidades;
    } else if (metaKg > 0) {
      unit = "kg";
      meta = metaKg;
      produzido = prodKg;
    }

    if (!unit || meta <= 0) return null;

    return {
      produto,
      unit,
      meta,
      produzido,
      metaBreakdown,
    };
  }
}

export const fornoDailySummaryService = new FornoDailySummaryService();


