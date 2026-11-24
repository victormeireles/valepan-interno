import { describe, expect, it } from 'vitest';
import { ColaboradorPlanilhaExcel } from './colaborador-planilha-excel';
import type { ColaboradorPlanilhaOrigem } from './colaborador-planilha';

const origem: ColaboradorPlanilhaOrigem = {
  codigo: 'VP-1',
  nome: 'Ana & Cia',
  setorNome: 'Forno',
  turnoNome: 'Manhã',
  dataAdmissao: '2026-11-20',
  situacao: 'ativo',
  afastamento: null,
  avisoAtivo: false,
  liderSetor: true,
};

describe('ColaboradorPlanilhaExcel', () => {
  it('gera um xlsx com cabeçalho, texto escapado e sem fórmula', () => {
    const bytes = new ColaboradorPlanilhaExcel().gerar(
      [origem, { ...origem, codigo: 'VP-2', nome: 'Ex', situacao: 'desligado' }],
      '2026-11-24',
    );
    const texto = new TextDecoder().decode(bytes);

    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
    expect(texto).toContain('id');
    expect(texto).toContain('data de admissao');
    expect(texto).toContain('Ana &amp; Cia');
    expect(texto).toContain('Período de experiência');
    expect(texto).not.toContain('>Ex<');
    expect(texto).not.toContain('<f>');
  });
});
