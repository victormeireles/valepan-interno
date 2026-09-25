import { describe, expect, it } from 'vitest';
import { FaltaPeriodoCalculo } from './falta-periodo';
import { FaltaResumoCalculo } from './falta-resumo';

describe('FaltaPeriodoCalculo', () => {
  it('abre no dia 1 e fecha ontem, e recua o mesmo recorte um mês', () => {
    const calc = new FaltaPeriodoCalculo();
    const atual = calc.mesAteOntem('2026-09-25');
    expect(atual).toEqual({ inicio: '2026-09-01', fim: '2026-09-24' });
    expect(calc.mesAnterior(atual)).toEqual({ inicio: '2026-08-01', fim: '2026-08-24' });
  });
});

describe('FaltaResumoCalculo', () => {
  it('compara pessoas e o setor/turno com mais gente em falta', () => {
    const resumo = new FaltaResumoCalculo().comparar(
      [
        { codigo: 'VP-1', cancelada: false, setorNome: 'Embalagem', turnoNome: 'Manhã' },
        { codigo: 'VP-1', cancelada: false, setorNome: 'Embalagem', turnoNome: 'Manhã' },
        { codigo: 'VP-2', cancelada: false, setorNome: 'Embalagem', turnoNome: 'Manhã' },
        { codigo: 'VP-3', cancelada: false, setorNome: 'Forno', turnoNome: 'Noite' },
      ],
      [
        { codigo: 'VP-9', cancelada: false, setorNome: 'Embalagem', turnoNome: 'Manhã' },
      ],
    );
    expect(resumo.faltas).toBe(4);
    expect(resumo.faltasAnterior).toBe(1);
    expect(resumo.pessoas).toBe(3);
    expect(resumo.reincidentes).toBe(1);
    expect(resumo.setor).toEqual({ nome: 'Embalagem', pessoas: 2, pessoasAnterior: 1 });
    expect(resumo.turno).toEqual({ nome: 'Embalagem · Manhã', pessoas: 2, pessoasAnterior: 1 });
  });
});
