import { describe, expect, it } from 'vitest';
import { CsvFormulaSeguro } from './csv-formula-seguro';

describe('CsvFormulaSeguro', () => {
  it('neutraliza fórmula e mantém o CPF como texto', () => {
    const csv = new CsvFormulaSeguro();
    expect(csv.celula('=CMD')).toBe(`"'=CMD"`);
    expect(csv.linha(['12345678901', 'Ana'])).toBe('"12345678901";"Ana"');
  });
});
