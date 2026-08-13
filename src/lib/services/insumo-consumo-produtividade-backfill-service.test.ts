import { describe, expect, it } from 'vitest';
import { InsumoConsumoProdutividadeFator } from '@/domain/insumos/insumo-consumo-produtividade-change';

describe('backfill fator sobre lançamentos históricos', () => {
  it('calcula delta de correção para cair na data do lote sem alterar o líquido já aplicado', () => {
    const fator = InsumoConsumoProdutividadeFator.calcular(12500, 25000);
    expect(fator).toBe(0.5);

    const deltaOriginal = -314.484;
    const alvo = deltaOriginal * (fator as number);
    const jaCorrigido = deltaOriginal + deltaOriginal * ((fator as number) - 1);
    const deltaNecessario = alvo - jaCorrigido;

    expect(alvo).toBeCloseTo(-157.242, 3);
    expect(deltaNecessario).toBeCloseTo(0, 9);
  });
});
