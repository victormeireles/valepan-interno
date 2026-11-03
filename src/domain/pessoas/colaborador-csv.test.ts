import { describe, expect, it } from 'vitest';
import { ColaboradorCsv } from './colaborador-csv';

describe('ColaboradorCsv', () => {
  it('inclui regime, CNPJ e razão social como texto', () => {
    const csv = new ColaboradorCsv().gerar([
      {
        codigo: 'VP-1',
        nome: 'Ana',
        cpf: null,
        situacao: 'ativo',
        regime: 'pj',
        cnpj: '11444777000161',
        razaoSocial: '=Pao',
      },
    ]);
    expect(csv.split('\n')[0]).toBe('codigo;nome;cpf;situacao;regime;cnpj;razao_social');
    expect(csv.split('\n')[0]).not.toMatch(/salario|vale_alimentacao|plano_saude/);
    expect(csv).toContain('"11444777000161"');
    expect(csv).toContain(`"'=Pao"`);
  });
});
