import { describe, expect, it } from 'vitest';
import type { UsuarioAuthzSnapshot } from '@/lib/auth/interno-access-manager';
import { ManutencaoAcesso } from './manutencao-acesso';

function snap(
  parcial: Partial<UsuarioAuthzSnapshot> = {},
): UsuarioAuthzSnapshot {
  return {
    isSystemOwner: false,
    identidades: ['interno'],
    modulosEfetivos: {},
    ...parcial,
  };
}

describe('ManutencaoAcesso', () => {
  const acesso = new ManutencaoAcesso();

  it('dono vê todas, administra e vê a fila mesmo sem módulos', () => {
    const dono = snap({ isSystemOwner: true });

    expect(acesso.veTodas(dono)).toBe(true);
    expect(acesso.administra(dono)).toBe(true);
    expect(acesso.veFila(dono)).toBe(true);
  });

  it('só leitura de manutenção vê todas e a fila, sem administrar', () => {
    const leitura = snap({
      modulosEfetivos: { interno_manutencao: 'ler' },
    });

    expect(acesso.veTodas(leitura)).toBe(true);
    expect(acesso.veFila(leitura)).toBe(true);
    expect(acesso.administra(leitura)).toBe(false);
  });

  it('só solicitação em edição vê a fila, sem ver todas nem administrar', () => {
    const solicitacao = snap({
      modulosEfetivos: { interno_manutencao_solicitacao: 'editar' },
    });

    expect(acesso.veFila(solicitacao)).toBe(true);
    expect(acesso.veTodas(solicitacao)).toBe(false);
    expect(acesso.administra(solicitacao)).toBe(false);
  });

  it('sem módulo não vê a fila, nem todas, nem administra', () => {
    const semModulo = snap();

    expect(acesso.veTodas(semModulo)).toBe(false);
    expect(acesso.administra(semModulo)).toBe(false);
    expect(acesso.veFila(semModulo)).toBe(false);
  });
});
