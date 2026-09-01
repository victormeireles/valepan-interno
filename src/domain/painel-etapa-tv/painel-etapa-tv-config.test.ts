import { describe, expect, it } from 'vitest';
import { getPainelEtapaTvConfig } from './painel-etapa-tv-config';

describe('getPainelEtapaTvConfig', () => {
  it('trava unidade LT/CX e mapeia chave do fluxo', () => {
    expect(getPainelEtapaTvConfig('fermentacao')).toMatchObject({
      fluxoKey: 'ferm',
      mode: 'lt',
      realizado: { title: 'Quadro', stageName: 'Fermentação', unit: 'lt' },
    });
    expect(getPainelEtapaTvConfig('forno').mode).toBe('lt');
    expect(getPainelEtapaTvConfig('embalagem')).toMatchObject({
      fluxoKey: 'emb',
      mode: 'cx',
      realizado: { unit: 'cx', stageName: 'Embalagem' },
    });
  });
});
