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

  it('aceita 62 dias e recusa o 63º', () => {
    expect(lancamento.periodo('2026-01-01', '2026-03-03')).toHaveLength(62);
    expect(() => lancamento.periodo('2026-01-01', '2026-03-04')).toThrow(/62/);
  });

  it('recusa período invertido', () => {
    expect(() => lancamento.periodo('2026-06-18', '2026-06-16')).toThrow(/inválido/);
  });

  it('separa o dia que já tem falta', () => {
    expect(lancamento.separar(['2026-01-01', '2026-01-02', '2026-01-04'], ['2026-01-02', '2026-01-04'])).toEqual({
      livres: ['2026-01-01'],
      repetidas: ['2026-01-02', '2026-01-04'],
    });
  });

  it('explica o lançamento e os dias que já existiam', () => {
    expect(lancamento.mensagem(1, [])).toBe('Falta registrada.');
    expect(lancamento.mensagem(5, [])).toBe('5 faltas registradas.');
    expect(lancamento.mensagem(4, ['2026-01-03'])).toBe('4 faltas registradas. 03/01/2026 já tinha falta.');
    expect(lancamento.mensagem(3, ['2026-01-02', '2026-01-04'])).toBe(
      '3 faltas registradas. 02/01/2026 e 04/01/2026 já tinham falta.',
    );
    expect(lancamento.mensagem(0, ['2026-01-01', '2026-01-02'])).toBe(
      'Já existe falta em 01/01/2026 e 02/01/2026.',
    );
  });
});
