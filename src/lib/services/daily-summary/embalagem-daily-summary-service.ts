import { PEDIDOS_EMBALAGEM_CONFIG } from "@/config/embalagem";
import { getProductionStatus } from "@/domain/types/realizado";
import { isSpecialPhotoClient } from "@/config/photoRules";

import {
  BaseDailySummaryService,
  ItemQuantityInfo,
  QuantityByUnit,
  StageSummaryResult,
  StageSummaryTotals,
} from "./base-daily-summary-service";

type EmbalagemRow = string[];

interface EmbalagemParsedRow {
  produto: string;
  cliente: string;
  unit: "cx" | "pct" | "un" | "kg";
  meta: number;
  produzido: number;
  metaBreakdown: QuantityByUnit;
  produzidoBreakdown: QuantityByUnit;
  hasRequiredPhotos: boolean;
}

export interface EmbalagemSummaryResult extends StageSummaryResult {
  photos: {
    missingRequiredCount: number;
    critical: ItemQuantityInfo[];
  };
}

export class EmbalagemDailySummaryService extends BaseDailySummaryService {
  protected stage = "embalagem";

  protected async loadRows(): Promise<string[][]> {
    const { spreadsheetId, tabName } = PEDIDOS_EMBALAGEM_CONFIG.destinoPedidos;
    const rows = await this.readSheet(spreadsheetId, `${tabName}!A:AB`);
    return rows.slice(1);
  }

  async build(date: string): Promise<EmbalagemSummaryResult> {
    const rows = await this.loadRows();
    return this.buildSummary(date, rows);
  }

  protected buildSummary(
    date: string,
    rows: EmbalagemRow[],
  ): EmbalagemSummaryResult {
    const completeTotals = this.createEmptyTotals();
    const partialTotals = this.createEmptyTotals();
    const notProducedTotals = this.createEmptyTotals();
    const highlighted: ItemQuantityInfo[] = [];
    const criticalPhotoItems: ItemQuantityInfo[] = [];

    let missingRequiredCount = 0;

    rows.forEach((row) => {
      const dataPedido = this.normalizeDate(row[0]);
      if (dataPedido !== date) return;

      const parsed = this.parseRow(row);
      if (!parsed) return;

      const status = getProductionStatus(parsed.produzido, parsed.meta);
      const targetTotals = this.getTargetTotals(
        status,
        completeTotals,
        partialTotals,
        notProducedTotals,
      );

      if (!targetTotals) return;

      if (status === "not-started") {
        this.addToQuantity(targetTotals.meta!, parsed.unit, parsed.meta);
        if (highlighted.length < 3) {
          highlighted.push({
            produto: parsed.produto,
            cliente: parsed.cliente,
            quantity: parsed.metaBreakdown,
          });
        }
      } else {
        this.addToQuantity(targetTotals.produced, parsed.unit, parsed.produzido);
        if (status === "partial") {
          this.addToQuantity(targetTotals.meta!, parsed.unit, parsed.meta);
        }
      }

      targetTotals.itemCount += 1;

      if (!parsed.hasRequiredPhotos) {
        missingRequiredCount += 1;
        if (status === "complete" || status === "partial") {
          if (criticalPhotoItems.length < 3) {
            criticalPhotoItems.push({
              produto: parsed.produto,
              cliente: parsed.cliente,
              quantity: parsed.produzidoBreakdown,
            });
          }
        }
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
      photos: {
        missingRequiredCount,
        critical: criticalPhotoItems,
      },
    };
  }

  private getTargetTotals(
    status: "complete" | "partial" | "not-started",
    completeTotals: StageSummaryTotals,
    partialTotals: StageSummaryTotals,
    notProducedTotals: StageSummaryTotals,
  ): StageSummaryTotals | null {
    switch (status) {
      case "complete":
        return completeTotals;
      case "partial":
        return partialTotals;
      case "not-started":
        return notProducedTotals;
      default:
        return null;
    }
  }

  private parseRow(row: EmbalagemRow): EmbalagemParsedRow | null {
    const produto = (row[4] || "").toString().trim();
    const cliente = (row[2] || "").toString().trim();
    if (!produto || !cliente) return null;

    const metaCaixas = Number(row[6] || 0);
    const metaPacotes = Number(row[7] || 0);
    const metaUnidades = Number(row[8] || 0);
    const metaKg = Number(row[9] || 0);

    const prodCaixas = Number(row[12] || 0);
    const prodPacotes = Number(row[13] || 0);
    const prodUnidades = Number(row[14] || 0);
    const prodKg = Number(row[15] || 0);

    const pacoteFotoUrl = (row[17] || "").toString().trim();
    const etiquetaFotoUrl = (row[20] || "").toString().trim();
    const palletFotoUrl = (row[23] || "").toString().trim();

    const metaBreakdown: QuantityByUnit = {};
    if (metaCaixas > 0) metaBreakdown.cx = metaCaixas;
    if (metaPacotes > 0) metaBreakdown.pct = metaPacotes;
    if (metaUnidades > 0) metaBreakdown.un = metaUnidades;
    if (metaKg > 0) metaBreakdown.kg = metaKg;

    const produzidoBreakdown: QuantityByUnit = {};
    if (prodCaixas > 0) produzidoBreakdown.cx = prodCaixas;
    if (prodPacotes > 0) produzidoBreakdown.pct = prodPacotes;
    if (prodUnidades > 0) produzidoBreakdown.un = prodUnidades;
    if (prodKg > 0) produzidoBreakdown.kg = prodKg;

    let unit: "cx" | "pct" | "un" | "kg" | null = null;
    let meta = 0;
    let produzido = 0;

    if (metaCaixas > 0) {
      unit = "cx";
      meta = metaCaixas;
      produzido = prodCaixas;
    } else if (metaPacotes > 0) {
      unit = "pct";
      meta = metaPacotes;
      produzido = prodPacotes;
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

    const hasRequiredPhotos = this.hasRequiredPhotos(cliente, {
      pacote: Boolean(pacoteFotoUrl),
      etiqueta: Boolean(etiquetaFotoUrl),
      pallet: Boolean(palletFotoUrl),
    });

    return {
      produto,
      cliente,
      unit,
      meta,
      produzido,
      metaBreakdown,
      produzidoBreakdown,
      hasRequiredPhotos,
    };
  }

  private hasRequiredPhotos(
    cliente: string,
    fotos: { pacote: boolean; etiqueta: boolean; pallet: boolean },
  ): boolean {
    const isSpecial = isSpecialPhotoClient(cliente);

    if (isSpecial) {
      return Boolean(fotos.pacote && fotos.pallet);
    }

    return Boolean(fotos.pacote && fotos.etiqueta && fotos.pallet);
  }
}

export const embalagemDailySummaryService = new EmbalagemDailySummaryService();


