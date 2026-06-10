import { hasEmbalagemQuantity } from "@/domain/realizado/embalagem-group-by-produto";
import type { Quantidade } from "@/domain/types/inventario";
import type { PainelPedidoEmbalagem } from "@/domain/types/painel-embalagem";
import { getProductionStatus } from "@/domain/types/realizado";
import { isSpecialPhotoClient } from "@/config/photoRules";
import { painelEmbalagemService } from "@/lib/services/painel-embalagem-service";

import {
  BaseDailySummaryService,
  ItemQuantityInfo,
  QuantityByUnit,
  StageSummaryResult,
  StageSummaryTotals,
} from "./base-daily-summary-service";

interface EmbalagemParsedPedido {
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

function quantidadeToBreakdown(q: Quantidade): QuantityByUnit {
  const breakdown: QuantityByUnit = {};
  if (q.caixas > 0) breakdown.cx = q.caixas;
  if (q.pacotes > 0) breakdown.pct = q.pacotes;
  if (q.unidades > 0) breakdown.un = q.unidades;
  if (q.kg > 0) breakdown.kg = q.kg;
  return breakdown;
}

export class EmbalagemDailySummaryService extends BaseDailySummaryService {
  protected stage = "embalagem";

  protected async loadRows(date: string): Promise<string[][]> {
    void date;
    return [];
  }

  async build(date: string): Promise<EmbalagemSummaryResult> {
    const { pedidos } = await painelEmbalagemService.getPainelForDate(date);
    return this.buildSummaryFromPedidos(date, pedidos);
  }

  protected buildSummary(date: string, rows: string[][]): EmbalagemSummaryResult {
    void rows;
    return this.buildSummaryFromPedidos(date, []);
  }

  protected buildSummaryFromPedidos(
    date: string,
    pedidos: PainelPedidoEmbalagem[],
  ): EmbalagemSummaryResult {
    const completeTotals = this.createEmptyTotals();
    const partialTotals = this.createEmptyTotals();
    const notProducedTotals = this.createEmptyTotals();
    const highlighted: ItemQuantityInfo[] = [];
    const criticalPhotoItems: ItemQuantityInfo[] = [];

    let missingRequiredCount = 0;

    pedidos.forEach((pedido) => {
      const parsed = this.parsePedido(pedido);
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

      const isFinished = status === "complete" || status === "partial";

      if (!parsed.hasRequiredPhotos && isFinished) {
        missingRequiredCount += 1;
        if (criticalPhotoItems.length < 3) {
          criticalPhotoItems.push({
            produto: parsed.produto,
            cliente: parsed.cliente,
            quantity: parsed.produzidoBreakdown,
          });
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

  private parsePedido(pedido: PainelPedidoEmbalagem): EmbalagemParsedPedido | null {
    const produto = pedido.produto.trim();
    const cliente = pedido.cliente.trim();
    if (!produto || !cliente) return null;

    const meta = pedido.aProduzir;
    if (meta <= 0) return null;

    return {
      produto,
      cliente,
      unit: pedido.unidade,
      meta,
      produzido: pedido.produzidoScalar,
      metaBreakdown: quantidadeToBreakdown(pedido.pedido),
      produzidoBreakdown: quantidadeToBreakdown(pedido.produzido),
      hasRequiredPhotos: this.pedidoHasRequiredPhotos(pedido),
    };
  }

  private pedidoHasRequiredPhotos(pedido: PainelPedidoEmbalagem): boolean {
    const lotesComQty = pedido.lotes.filter((lote) =>
      hasEmbalagemQuantity(lote.quantidade),
    );

    if (lotesComQty.length === 0) {
      return pedido.produzidoScalar <= 0;
    }

    return lotesComQty.every((lote) =>
      this.hasRequiredPhotos(pedido.cliente, {
        pacote: Boolean(lote.pacoteFotoUrl),
        etiqueta: Boolean(lote.etiquetaFotoUrl),
        pallet: Boolean(lote.palletFotoUrl),
      }),
    );
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
