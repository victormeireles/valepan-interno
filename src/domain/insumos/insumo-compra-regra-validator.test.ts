import { describe, expect, it } from 'vitest';
import {
  InsumoCompraRegraValidator,
  type InsumoCompraRegraValidatorInput,
} from './insumo-compra-regra-validator';

function baseInput(
  overrides: Partial<InsumoCompraRegraValidatorInput> = {},
): InsumoCompraRegraValidatorInput {
  return {
    janelaTipo: 'qualquer',
    diasSemana: null,
    quantidadeMinima: null,
    quantidadeMaxima: null,
    distribuidores: [{ nome: 'PANTEC', preferencial: true }],
    ...overrides,
  };
}

describe('InsumoCompraRegraValidator', () => {
  const validator = new InsumoCompraRegraValidator();

  it('aceita regra válida', () => {
    expect(validator.validate(baseInput())).toEqual({ ok: true });
  });

  it('rejeita min > max', () => {
    const result = validator.validate(
      baseInput({ quantidadeMinima: 100, quantidadeMaxima: 50 }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.erros.some((e) => /m[ií]nima.*m[aá]xima/i.test(e))).toBe(true);
    }
  });

  it('rejeita dias_semana vazio quando tipo é dias_semana', () => {
    const result = validator.validate(
      baseInput({ janelaTipo: 'dias_semana', diasSemana: [] }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.erros.some((e) => /dia/i.test(e))).toBe(true);
    }
  });

  it('rejeita dias_semana null quando tipo é dias_semana', () => {
    const result = validator.validate(
      baseInput({ janelaTipo: 'dias_semana', diasSemana: null }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.erros.some((e) => /dia/i.test(e))).toBe(true);
    }
  });

  it('rejeita mais de um preferencial', () => {
    const result = validator.validate(
      baseInput({
        distribuidores: [
          { nome: 'PANTEC', preferencial: true },
          { nome: 'DOUGLAS', preferencial: true },
        ],
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.erros.some((e) => /preferencial/i.test(e))).toBe(true);
    }
  });

  it('rejeita nome vazio', () => {
    const result = validator.validate(
      baseInput({
        distribuidores: [{ nome: '   ', preferencial: true }],
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.erros.some((e) => /nome/i.test(e))).toBe(true);
    }
  });
});
