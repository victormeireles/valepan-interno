import { describe, expect, it } from 'vitest';
import { TurnoCodigo } from './turno-codigo';

describe('TurnoCodigo', () => {
  it('monta o código a partir do setor e do nome', () => {
    expect(new TurnoCodigo().gerar('PRO', 'Manhã', [])).toBe('PRO-MANHA');
  });

  it('evita código já usado', () => {
    expect(new TurnoCodigo().gerar('PRO', 'Manhã', ['PRO-MANHA'])).toBe('PRO-MANHA2');
  });
});
