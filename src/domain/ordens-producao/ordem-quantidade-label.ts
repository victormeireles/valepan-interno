export type ModoQuantidadeOrdem = 'latas' | 'unidades';

export function resolveModoQuantidade(
  assadeiraId: string,
  assadeiras: number,
): ModoQuantidadeOrdem {
  if (!assadeiraId && assadeiras <= 0) return 'unidades';
  return 'latas';
}

export function formatOrdemQuantidadeLabel(input: {
  modo: ModoQuantidadeOrdem;
  assadeiras: number;
  unidades: number;
  caixas: number;
}): string {
  if (input.modo === 'unidades') {
    const cx = input.caixas > 0 ? ` • ${input.caixas} CX` : '';
    return `${input.unidades} UN${cx}`;
  }
  const base = `${input.assadeiras} LT → ${input.unidades} UN`;
  return input.caixas > 0 ? `${base} • ${input.caixas} CX` : base;
}
