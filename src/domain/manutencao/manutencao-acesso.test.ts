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

  it('forno em edição vê a fila e abre corretiva, sem ver todas nem oficina nem estoque', () => {
    const forno = snap({
      modulosEfetivos: { interno_forno: 'editar' },
    });

    expect(acesso.veFila(forno)).toBe(true);
    expect(acesso.veTodas(forno)).toBe(false);
    expect(acesso.abreCorretiva(forno)).toBe(true);
    expect(acesso.executaOficina(forno)).toBe(false);
    expect(acesso.movimenta(forno)).toBe(false);
  });

  it('forno só em leitura não vê a fila nem abre corretiva', () => {
    const fornoLeitura = snap({
      modulosEfetivos: { interno_forno: 'ler' },
    });

    expect(acesso.veFila(fornoLeitura)).toBe(false);
    expect(acesso.abreCorretiva(fornoLeitura)).toBe(false);
  });

  it('fermentação em edição vê a fila e abre corretiva', () => {
    const fermentacao = snap({
      modulosEfetivos: { interno_fermentacao: 'editar' },
    });

    expect(acesso.veFila(fermentacao)).toBe(true);
    expect(acesso.abreCorretiva(fermentacao)).toBe(true);
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

  it('leitura e ausência de módulo não movimentam', () => {
    const leitura = snap({
      modulosEfetivos: { interno_manutencao: 'ler' },
    });

    expect(acesso.movimenta(leitura)).toBe(false);
    expect(acesso.movimenta(snap())).toBe(false);
  });

  it('dono do sistema movimenta mesmo sem módulos', () => {
    expect(acesso.movimenta(snap({ isSystemOwner: true }))).toBe(true);
  });

  it('abre corretiva quem edita manutenção, e o dono', () => {
    const oficina = snap({ modulosEfetivos: { interno_manutencao: 'editar' } });
    const admin = snap({
      modulosEfetivos: { interno_manutencao: 'administrar' },
    });
    const leitura = snap({ modulosEfetivos: { interno_manutencao: 'ler' } });

    expect(acesso.abreCorretiva(oficina)).toBe(true);
    expect(acesso.abreCorretiva(admin)).toBe(true);
    expect(acesso.abreCorretiva(snap({ isSystemOwner: true }))).toBe(true);
    expect(acesso.abreCorretiva(leitura)).toBe(false);
    expect(acesso.abreCorretiva(snap())).toBe(false);
  });

  it('executa a oficina quem edita manutenção', () => {
    const oficina = snap({ modulosEfetivos: { interno_manutencao: 'editar' } });
    const admin = snap({
      modulosEfetivos: { interno_manutencao: 'administrar' },
    });

    expect(acesso.executaOficina(oficina)).toBe(true);
    expect(acesso.executaOficina(admin)).toBe(true);
    expect(acesso.executaOficina(snap({ isSystemOwner: true }))).toBe(true);
    expect(
      acesso.executaOficina(
        snap({ modulosEfetivos: { interno_manutencao: 'ler' } }),
      ),
    ).toBe(false);
    expect(acesso.executaOficina(snap())).toBe(false);
  });
});
