import { describe, expect, it } from 'vitest';
import { FaltaJanelaResumo } from './falta-janela-resumo';

describe('FaltaJanelaResumo', () => {
  const resumo = new FaltaJanelaResumo();

  it('abre a janela 90 dias antes de hoje, inclusive', () => {
    expect(resumo.periodo('2026-10-26')).toEqual({ inicio: '2026-07-28', fim: '2026-10-26' });
  });

  it('separa total, injustificadas, advertência e suspensão', () => {
    const contagem = resumo.contar([
      { classificacao: 'injustificada', medida: 'advertencia', cancelada: false },
      { classificacao: 'injustificada', medida: 'suspensao', cancelada: false },
      { classificacao: 'injustificada', medida: null, cancelada: false },
      { classificacao: 'justificada', medida: null, cancelada: false },
      { classificacao: 'pendente', medida: null, cancelada: false },
      { classificacao: 'injustificada', medida: 'justa_causa', cancelada: false },
      { classificacao: 'injustificada', medida: 'suspensao', cancelada: true },
    ]);

    expect(contagem).toEqual({
      total: 6,
      injustificadas: 4,
      advertencia: 1,
      suspensao: 1,
    });
  });
});
