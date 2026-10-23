import { describe, expect, it } from 'vitest';
import { VinculoRegras } from './vinculo-regras';

const regras = new VinculoRegras();

describe('VinculoRegras', () => {
  it('converte reserva na mesma vaga e recusa ocupação', () => {
    expect(regras.admitir({ papel: 'reserva', posicaoCodigo: 'PRO-M-01', turnoCodigo: 'PRO-M' })).toEqual({
      papel: 'ocupacao',
    });
    expect(() => regras.admitir({ papel: 'ocupacao', posicaoCodigo: 'PRO-M-01', turnoCodigo: 'PRO-M' })).toThrow(
      /reserva/,
    );
  });

  it('desiste só de reserva', () => {
    expect(regras.desistir({ papel: 'reserva', posicaoCodigo: 'PRO-MAD-01', turnoCodigo: 'PRO-MAD' })).toEqual({
      encerraReserva: true,
    });
    expect(() => regras.desistir(null)).toThrow(/reserva/);
  });

  it('transfere para vaga livre e não inventa posição', () => {
    const livre = { codigo: 'LAT-T-01', turnoCodigo: 'LAT-T', operacional: true };
    expect(
      regras.transferir({ papel: 'ocupacao', posicaoCodigo: 'PRO-M-01', turnoCodigo: 'PRO-M' }, [livre], 'LAT-T'),
    ).toEqual(livre);
    expect(regras.transferir(null, [livre], 'LAT-T')).toEqual(livre);
    expect(() =>
      regras.transferir({ papel: 'ocupacao', posicaoCodigo: 'PRO-M-01', turnoCodigo: 'PRO-M' }, [], 'LAT-T'),
    ).toThrow(/vaga livre/);
  });

  it('data em branco ou futura fica para entrar e data de hoje admite', () => {
    expect(regras.classificarAdmissao('', '2026-10-21')).toEqual({ data: null, prevista: true });
    expect(regras.classificarAdmissao('2026-11-02', '2026-10-21')).toEqual({
      data: '2026-11-02',
      prevista: true,
    });
    expect(regras.classificarAdmissao('2026-10-21', '2026-10-21')).toEqual({
      data: '2026-10-21',
      prevista: false,
    });
    expect(() => regras.classificarAdmissao('21/10/2026', '2026-10-21')).toThrow(/admissão/);
  });

  it('data futura permanece em aviso e exige com ou sem trabalho', () => {
    expect(regras.desligar('2026-10-01', '2026-09-25', 'com_trabalho')).toEqual({
      data: '2026-10-01',
      futuro: true,
      tipo: 'com_trabalho',
    });
    expect(regras.desligar('2026-09-25', '2026-09-25', 'sem_trabalho').futuro).toBe(false);
    expect(() => regras.desligar('2026-10-01', '2026-09-25', '')).toThrow(/trabalho/);
  });

  it('cancela só com aviso ativo', () => {
    expect(regras.cancelarAviso(true)).toEqual({ cancela: true });
    expect(() => regras.cancelarAviso(false)).toThrow(/aviso ativo/);
  });
});
