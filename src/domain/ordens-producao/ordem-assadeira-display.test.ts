import { describe, expect, it } from 'vitest';
import { resolveAssadeiraDisplayVariant } from './ordem-assadeira-display';

describe('resolveAssadeiraDisplayVariant', () => {
  it('retorna sem para produto sem assadeira', () => {
    expect(
      resolveAssadeiraDisplayVariant({
        assadeiraId: '',
        assadeiras: 0,
        produtoDefaultAssadeiraId: 'ass-1',
      }),
    ).toBe('sem');
  });

  it('retorna padrao quando coincide com default do produto', () => {
    expect(
      resolveAssadeiraDisplayVariant({
        assadeiraId: 'ass-1',
        assadeiras: 12,
        produtoDefaultAssadeiraId: 'ass-1',
      }),
    ).toBe('padrao');
  });

  it('retorna alternativa quando difere do default', () => {
    expect(
      resolveAssadeiraDisplayVariant({
        assadeiraId: 'ass-2',
        assadeiras: 12,
        produtoDefaultAssadeiraId: 'ass-1',
      }),
    ).toBe('alternativa');
  });
});
