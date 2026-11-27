import { describe, expect, it } from 'vitest';
import { GeracaoImediataPreventiva } from './geracao-imediata-preventiva';

describe('GeracaoImediataPreventiva', () => {
  const regra = new GeracaoImediataPreventiva();

  it('abre a ordem quando a próxima data é hoje', () => {
    expect(regra.deveGerar('2026-11-26', '2026-11-26')).toBe(true);
  });

  it('abre a ordem quando a data já venceu', () => {
    expect(regra.deveGerar('2026-11-25T00:00:00', '2026-11-26')).toBe(true);
  });

  it('espera a data quando a próxima ainda é futura', () => {
    expect(regra.deveGerar('2026-12-24', '2026-11-26')).toBe(false);
  });
});
