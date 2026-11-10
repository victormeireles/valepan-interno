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

  it('editar e administrar movimentam o estoque', () => {
    const editar = snap({
      modulosEfetivos: { interno_manutencao: 'editar' },
    });
    const administrar = snap({
      modulosEfetivos: { interno_manutencao: 'administrar' },
    });

    expect(acesso.movimenta(editar)).toBe(true);
    expect(acesso.movimenta(administrar)).toBe(true);
  });

  it('leitura, solicitação e ausência de módulo não movimentam', () => {
    const leitura = snap({
      modulosEfetivos: { interno_manutencao: 'ler' },
    });
    const solicitacao = snap({
      modulosEfetivos: { interno_manutencao_solicitacao: 'editar' },
    });

    expect(acesso.movimenta(leitura)).toBe(false);
    expect(acesso.movimenta(solicitacao)).toBe(false);
    expect(acesso.movimenta(snap())).toBe(false);
  });

  it('dono do sistema movimenta mesmo sem módulos', () => {
    expect(acesso.movimenta(snap({ isSystemOwner: true }))).toBe(true);
  });

  it('abre corretiva quem edita manutenção ou solicitação, e o dono', () => {
    const oficina = snap({ modulosEfetivos: { interno_manutencao: 'editar' } });
    const admin = snap({ modulosEfetivos: { interno_manutencao: 'administrar' } });
    const solicitacao = snap({
      modulosEfetivos: { interno_manutencao_solicitacao: 'editar' },
    });
    const leitura = snap({ modulosEfetivos: { interno_manutencao: 'ler' } });
    const solicitacaoLeitura = snap({
      modulosEfetivos: { interno_manutencao_solicitacao: 'ler' },
    });

    expect(acesso.abreCorretiva(oficina)).toBe(true);
    expect(acesso.abreCorretiva(admin)).toBe(true);
    expect(acesso.abreCorretiva(solicitacao)).toBe(true);
    expect(acesso.abreCorretiva(snap({ isSystemOwner: true }))).toBe(true);
    expect(acesso.abreCorretiva(leitura)).toBe(false);
    expect(acesso.abreCorretiva(solicitacaoLeitura)).toBe(false);
    expect(acesso.abreCorretiva(snap())).toBe(false);
  });

  it('executa a oficina quem edita manutenção, sem a solicitação', () => {
    const oficina = snap({ modulosEfetivos: { interno_manutencao: 'editar' } });
    const admin = snap({ modulosEfetivos: { interno_manutencao: 'administrar' } });
    const solicitacao = snap({
      modulosEfetivos: { interno_manutencao_solicitacao: 'editar' },
    });

    expect(acesso.executaOficina(oficina)).toBe(true);
    expect(acesso.executaOficina(admin)).toBe(true);
    expect(acesso.executaOficina(snap({ isSystemOwner: true }))).toBe(true);
    expect(acesso.executaOficina(solicitacao)).toBe(false);
    expect(acesso.executaOficina(snap({ modulosEfetivos: { interno_manutencao: 'ler' } }))).toBe(
      false,
    );
    expect(acesso.executaOficina(snap())).toBe(false);
  });
});
