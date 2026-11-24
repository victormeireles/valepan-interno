import { describe, expect, it } from 'vitest';
import { ColaboradorPlanilhaRowParser } from './colaborador-planilha-row-parser';

describe('ColaboradorPlanilhaRowParser', () => {
  const parser = new ColaboradorPlanilhaRowParser();

  it('lê admissão, setor, turno e afastamento', () => {
    const [linha] = parser.parseAll([
      {
        codigo: 'VP-1',
        nome: 'Ana',
        situacao: 'afastado',
        afastamento: 'inss',
        lider_setor: true,
        data_admissao: '2026-11-01',
        pessoas_setores: { nome: 'Forno' },
        pessoas_turnos: [{ nome: 'Manhã' }],
      },
    ]);

    expect(linha).toEqual({
      codigo: 'VP-1',
      nome: 'Ana',
      setorNome: 'Forno',
      turnoNome: 'Manhã',
      dataAdmissao: '2026-11-01',
      situacao: 'afastado',
      afastamento: 'inss',
      avisoAtivo: false,
      liderSetor: true,
    });
  });

  it('rejeita linha sem nome', () => {
    expect(() => parser.parseAll([{ codigo: 'VP-1', situacao: 'ativo' }])).toThrow(/nome/);
  });
});
