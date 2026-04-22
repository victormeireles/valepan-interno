import type { ProductConversionInfo } from '@/lib/utils/production-conversions';
import {
  quantidadePlanejadaParaUnidadesConsumo,
  unidadesConsumoParaQuantidadePlanejada,
} from '@/lib/utils/production-conversions';

export type PlanningQuantityInputKind = 'caixa' | 'latas' | 'unidades';

function isLataLikeUnidadePadrao(product: ProductConversionInfo): boolean {
  const u = product.unidadeNomeResumido?.toLowerCase().trim() || '';
  return u === 'lt' || u.includes('lata') || u.includes('bandeja');
}

export class PlanningQuantityInputConverter {
  /** Valor exibido no campo conforme o modo, dado o “consumo” já alinhado a `quantidadePlanejadaParaUnidadesConsumo`. */
  static displayRawForMode(
    unidadesConsumo: number,
    kind: PlanningQuantityInputKind,
    product: ProductConversionInfo,
  ): number {
    if (kind === 'unidades') {
      return unidadesConsumo;
    }
    if (kind === 'caixa') {
      const b = product.box_units;
      if (!b || b <= 0) {
        return unidadesConsumo;
      }
      return unidadesConsumo / b;
    }
    if (isLataLikeUnidadePadrao(product)) {
      return unidadesConsumo;
    }
    const ua = product.unidades_assadeira;
    if (!ua || ua <= 0) {
      return unidadesConsumo;
    }
    return unidadesConsumo / ua;
  }

  static unidadesConsumoFromInput(
    kind: PlanningQuantityInputKind,
    rawValue: number,
    product: ProductConversionInfo,
  ): { ok: true; value: number } | { ok: false; message: string } {
    if (!Number.isFinite(rawValue) || rawValue <= 0) {
      return { ok: false, message: 'Informe uma quantidade maior que zero.' };
    }
    if (kind === 'unidades') {
      return { ok: true, value: rawValue };
    }
    if (kind === 'caixa') {
      const b = product.box_units;
      if (!b || b <= 0) {
        return {
          ok: false,
          message: 'Este produto não tem unidades por caixa cadastradas (box_units).',
        };
      }
      return { ok: true, value: rawValue * b };
    }
    if (isLataLikeUnidadePadrao(product)) {
      return { ok: true, value: rawValue };
    }
    const ua = product.unidades_assadeira;
    if (!ua || ua <= 0) {
      return {
        ok: false,
        message: 'Este produto não tem unidades por lata (assadeira) cadastradas.',
      };
    }
    return { ok: true, value: rawValue * ua };
  }

  static computeQtdPlanejada(
    kind: PlanningQuantityInputKind,
    rawValue: number,
    product: ProductConversionInfo,
  ):
    | { ok: true; qtdPlanejada: number }
    | { ok: false; message: string } {
    const step = PlanningQuantityInputConverter.unidadesConsumoFromInput(kind, rawValue, product);
    if (!step.ok) {
      return step;
    }
    const qtdPlanejada = unidadesConsumoParaQuantidadePlanejada(step.value, product);
    return { ok: true, qtdPlanejada };
  }
}

export function productInfoFromPlanningMeta(
  meta: Record<string, unknown> | null | undefined,
): ProductConversionInfo | null {
  if (!meta || typeof meta.unidadeNomeResumido !== 'string') {
    return null;
  }
  const ua =
    (meta.unidades_assadeira as number | null | undefined) ??
    (meta.unidades_lata_antiga as number | null | undefined) ??
    null;
  const uaAntiga =
    (meta.unidades_lata_antiga as number | null | undefined) ?? ua;
  return {
    unidadeNomeResumido: meta.unidadeNomeResumido,
    package_units: (meta.package_units as number | null | undefined) ?? null,
    box_units: (meta.box_units as number | null | undefined) ?? null,
    unidades_assadeira: ua,
    unidades_lata_antiga: uaAntiga,
    unidades_lata_nova: (meta.unidades_lata_nova as number | null | undefined) ?? null,
    receita_massa: meta.receita_massa as ProductConversionInfo['receita_massa'],
  };
}

export { quantidadePlanejadaParaUnidadesConsumo };
