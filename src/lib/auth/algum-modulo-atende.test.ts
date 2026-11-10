import { describe, expect, it } from 'vitest';
import type { UsuarioAuthzSnapshot } from './interno-access-manager';
import { algumModuloAtende } from './algum-modulo-atende';

function snap(
  modulosEfetivos: UsuarioAuthzSnapshot['modulosEfetivos'],
): UsuarioAuthzSnapshot {
  return {
    isSystemOwner: false,
    identidades: ['interno'],
    modulosEfetivos,
  };
}

describe('algumModuloAtende', () => {
  it('é verdadeiro quando um dos módulos atende o nível', () => {
    const leituraEFermentacao = snap({
      interno_manutencao: 'ler',
      interno_fermentacao: 'editar',
    });

    expect(
      algumModuloAtende(
        leituraEFermentacao,
        ['interno_manutencao', 'interno_fermentacao'],
        'editar',
      ),
    ).toBe(true);
  });

  it('ler não atende o mínimo administrar', () => {
    const soLeitura = snap({ interno_manutencao: 'ler' });

    expect(
      algumModuloAtende(
        soLeitura,
        ['interno_manutencao', 'interno_fermentacao'],
        'administrar',
      ),
    ).toBe(false);
  });
});
