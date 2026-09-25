import { describe, expect, it } from 'vitest';
import { FaltaLancamento } from './falta-lancamento';

describe('FaltaLancamento', () => {
  const lancamento = new FaltaLancamento();

  it('recusa falta repetida no mesmo dia', () => {
    expect(() =>
      lancamento.validar(
        {
          colaboradorCodigo: 'VP-9001',
          data: '2026-06-09',
          classificacao: 'injustificada',
          justificativa: null,
        },
        ['2026-06-09'],
      ),
    ).toThrow(/falta ativa/);
  });

  it('lista os dias do período para o RH desmarcar', () => {
    expect(lancamento.periodo('2026-06-16', '2026-06-18')).toEqual([
      '2026-06-16',
      '2026-06-17',
      '2026-06-18',
    ]);
  });
});
