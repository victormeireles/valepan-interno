import { describe, expect, it } from 'vitest';
import { QuadroHorarioAnexo } from './quadro-horario-anexo';

describe('QuadroHorarioAnexo', () => {
  it('inclui turno ativo sem vaga aprovada', () => {
    const linhas = new QuadroHorarioAnexo().completar([], [
      {
        turnoCodigo: 'AP-COM',
        turnoNome: '09:00–18:00',
        setorNome: 'Comercial',
        setorCodigo: 'COM',
        dias: [],
      },
    ]);
    expect(linhas[0]?.turnoCodigo).toBe('AP-COM');
    expect(linhas[0]?.aprovado).toBe(0);
  });
});
