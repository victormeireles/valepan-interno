import { describe, expect, it } from 'vitest';

import { shouldShowAssadeiraNomeTag } from './should-show-assadeira-nome-tag';

describe('shouldShowAssadeiraNomeTag', () => {
  it('mostra quando há nome e o produto tem mais de uma opção cadastrada', () => {
    expect(
      shouldShowAssadeiraNomeTag({
        assadeiraNome: '24',
        temMultiplasAssadeirasCadastradas: true,
      }),
    ).toBe(true);
  });

  it('omite quando o produto só tem uma opção cadastrada', () => {
    expect(
      shouldShowAssadeiraNomeTag({
        assadeiraNome: '24',
        temMultiplasAssadeirasCadastradas: false,
      }),
    ).toBe(false);
  });

  it('omite quando não há nome de assadeira', () => {
    expect(
      shouldShowAssadeiraNomeTag({
        assadeiraNome: '  ',
        temMultiplasAssadeirasCadastradas: true,
      }),
    ).toBe(false);
  });
});
