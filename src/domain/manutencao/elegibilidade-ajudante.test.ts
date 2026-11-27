import { describe, expect, it } from 'vitest';
import { ElegibilidadeAjudante, type PerfilAjudante } from './elegibilidade-ajudante';

function perfil(parcial: Partial<PerfilAjudante> = {}): PerfilAjudante {
  return {
    ativo: true,
    sistema: false,
    modulos: [{ modulo: 'interno_manutencao', nivel: 'editar' }],
    ...parcial,
  };
}

describe('ElegibilidadeAjudante', () => {
  const regra = new ElegibilidadeAjudante();

  it('aceita quem edita ou administra manutenção fora do perfil de sistema', () => {
    expect(regra.aceita(perfil())).toBe(true);
    expect(regra.aceita(perfil({ modulos: [{ modulo: 'interno_manutencao', nivel: 'administrar' }] }))).toBe(
      true,
    );
  });

  it('recusa o perfil de sistema, mesmo com manutenção em administrar', () => {
    expect(
      regra.aceita(
        perfil({
          sistema: true,
          modulos: [{ modulo: 'interno_manutencao', nivel: 'administrar' }],
        }),
      ),
    ).toBe(false);
  });

  it('recusa perfil inativo, só leitura ou sem o módulo da oficina', () => {
    expect(regra.aceita(perfil({ ativo: false }))).toBe(false);
    expect(regra.aceita(perfil({ modulos: [{ modulo: 'interno_manutencao', nivel: 'ler' }] }))).toBe(
      false,
    );
    expect(regra.aceita(perfil({ modulos: [{ modulo: 'interno_config', nivel: 'administrar' }] }))).toBe(
      false,
    );
    expect(regra.aceita(null)).toBe(false);
  });
});
