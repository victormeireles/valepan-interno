export type DeriveQuantidadesInput = {
  assadeiras: number;
  unidadesPorAssadeira: number;
  boxUnits?: number | null;
};

export type DerivedQuantidades = {
  unidades: number;
  caixas: number;
  pacotes: number;
  kg: number;
};

export function deriveQuantidadesFromAssadeiras(
  input: DeriveQuantidadesInput,
): DerivedQuantidades {
  const unidades = Math.round(input.assadeiras * input.unidadesPorAssadeira);
  const caixas =
    input.boxUnits && input.boxUnits > 0
      ? Math.floor(unidades / input.boxUnits)
      : 0;
  return { unidades, caixas, pacotes: 0, kg: 0 };
}

export function deriveQuantidadesFromUnidades(input: {
  unidades: number;
  boxUnits?: number | null;
}): DerivedQuantidades {
  const unidades = Math.round(input.unidades);
  const caixas =
    input.boxUnits && input.boxUnits > 0
      ? Math.floor(unidades / input.boxUnits)
      : 0;
  return { unidades, caixas, pacotes: 0, kg: 0 };
}

export function assadeirasFromSheetQuantidade(
  q: { caixas: number; pacotes: number; unidades: number; kg: number },
  ctx: { unidadesPorAssadeira: number; boxUnits: number | null },
): number {
  let totalUnidades = q.unidades;
  if (totalUnidades <= 0 && q.caixas > 0 && ctx.boxUnits && ctx.boxUnits > 0) {
    totalUnidades = q.caixas * ctx.boxUnits;
  }
  if (totalUnidades <= 0 || ctx.unidadesPorAssadeira <= 0) return 0;
  return totalUnidades / ctx.unidadesPorAssadeira;
}
