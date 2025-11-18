import { readSheetValues } from "@/lib/googleSheets";
import { normalizeToISODate } from "@/lib/utils/date-utils";

export type UnitKey = "lt" | "un" | "kg" | "cx" | "pct";

export type QuantityByUnit = Partial<Record<UnitKey, number>>;

export interface ItemQuantityInfo {
  produto: string;
  cliente?: string;
  quantity: QuantityByUnit;
}

export interface StageSummaryTotals {
  itemCount: number;
  produced: QuantityByUnit;
  meta?: QuantityByUnit;
}

export interface StageSummarySection {
  complete: StageSummaryTotals;
  partial: StageSummaryTotals;
  notProduced: {
    itemCount: number;
    meta: QuantityByUnit;
    highlighted: ItemQuantityInfo[];
  };
}

export interface StageSummaryResult {
  date: string;
  totals: StageSummarySection;
}

export abstract class BaseDailySummaryService {
  protected abstract stage: string;

  async build(date: string): Promise<StageSummaryResult> {
    const rows = await this.loadRows(date);
    return this.buildSummary(date, rows);
  }

  protected addToQuantity(
    accumulator: QuantityByUnit,
    unit: UnitKey,
    value: number,
  ): void {
    if (!unit || Number.isNaN(value)) {
      return;
    }

    accumulator[unit] = Number((accumulator[unit] ?? 0) + value);
  }

  protected normalizeDate(value: unknown): string {
    if (!value) return "";
    const str = value.toString().trim();
    if (!str) return "";

    // Usar a função utilitária que evita problemas de timezone
    const normalized = normalizeToISODate(str);
    
    // Se a normalização retornou uma data válida, retornar
    // Caso contrário, retornar string vazia (comportamento original)
    if (normalized && /^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      return normalized;
    }

    return "";
  }

  protected createEmptyTotals(): StageSummaryTotals {
    return {
      itemCount: 0,
      produced: {},
      meta: {},
    };
  }

  protected abstract loadRows(date: string): Promise<string[][]>;

  protected abstract buildSummary(
    date: string,
    rows: string[][],
  ): StageSummaryResult;

  protected async readSheet(spreadsheetId: string, range: string) {
    return readSheetValues(spreadsheetId, range);
  }
}


