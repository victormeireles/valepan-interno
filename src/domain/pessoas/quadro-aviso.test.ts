import { describe, expect, it } from 'vitest';
import { QuadroAviso } from './quadro-aviso';

describe('QuadroAviso', () => {
  const aviso = new QuadroAviso();

  it('marca ocupação com aviso ativo', () => {
    expect(aviso.pendente({ avisoAtivo: true, papel: 'ocupacao' })).toBe(true);
    expect(aviso.ocupaVaga({ avisoAtivo: true, papel: 'ocupacao' })).toBe(true);
    expect(aviso.rotulo({ avisoAtivo: true })).toBe('Em aviso');
  });

  it('marca PJ com saída prevista na ocupação', () => {
    const pessoa = { papel: 'ocupacao', regime: 'pj' as const, dataDesligamento: '2026-12-01' };
    expect(aviso.pendente(pessoa)).toBe(true);
    expect(aviso.ocupaVaga(pessoa)).toBe(true);
    expect(aviso.rotulo(pessoa)).toBe('Saída prevista');
  });

  it('não conta afastado ou apoio na vaga', () => {
    expect(aviso.ocupaVaga({ avisoAtivo: true, papel: 'afastado' })).toBe(false);
    expect(aviso.ocupaVaga({ avisoAtivo: true, papel: 'apoio' })).toBe(false);
    expect(aviso.ocupaVaga({ avisoAtivo: true, papel: 'reserva' })).toBe(false);
  });

  it('ignora quem não tem saída marcada', () => {
    expect(aviso.pendente({ papel: 'ocupacao' })).toBe(false);
    expect(aviso.ocupaVaga({ papel: 'ocupacao' })).toBe(false);
    expect(aviso.rotulo({ papel: 'ocupacao' })).toBeNull();
  });
});
