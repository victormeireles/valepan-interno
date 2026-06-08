import { describe, expect, it } from 'vitest';
import { resolverCamposRealizadoEmbalagem } from '@/domain/embalagem/painel-quantidade';

describe('resolverCamposRealizadoEmbalagem', () => {
  it('meta com caixas libera caixas e pacotes', () => {
    expect(
      resolverCamposRealizadoEmbalagem({ caixas: 225, pacotes: 0, unidades: 0, kg: 0 }),
    ).toEqual({ caixas: true, pacotes: true, unidades: false, kg: false });
  });

  it('meta só com pacotes libera caixas e pacotes', () => {
    expect(
      resolverCamposRealizadoEmbalagem({ caixas: 0, pacotes: 30, unidades: 0, kg: 0 }),
    ).toEqual({ caixas: true, pacotes: true, unidades: false, kg: false });
  });

  it('meta cx + pct libera caixas e pacotes', () => {
    expect(
      resolverCamposRealizadoEmbalagem({ caixas: 10, pacotes: 5, unidades: 0, kg: 0 }),
    ).toEqual({ caixas: true, pacotes: true, unidades: false, kg: false });
  });

  it('meta com unidades libera só unidades', () => {
    expect(
      resolverCamposRealizadoEmbalagem({ caixas: 0, pacotes: 0, unidades: 500, kg: 0 }),
    ).toEqual({ caixas: false, pacotes: false, unidades: true, kg: false });
  });

  it('meta com kg libera só kg', () => {
    expect(
      resolverCamposRealizadoEmbalagem({ caixas: 0, pacotes: 0, unidades: 0, kg: 12 }),
    ).toEqual({ caixas: false, pacotes: false, unidades: false, kg: true });
  });

  it('meta zerada usa fallback (todos visíveis)', () => {
    expect(
      resolverCamposRealizadoEmbalagem({ caixas: 0, pacotes: 0, unidades: 0, kg: 0 }),
    ).toEqual({ caixas: true, pacotes: true, unidades: true, kg: true });
  });
});
