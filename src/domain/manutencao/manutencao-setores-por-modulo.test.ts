import { describe, expect, it } from 'vitest';
import type { UsuarioAuthzSnapshot } from '@/lib/auth/interno-access-manager';
import { ManutencaoSetoresPorModulo } from './manutencao-setores-por-modulo';

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

describe('ManutencaoSetoresPorModulo', () => {
  const mapa = new ManutencaoSetoresPorModulo();

  it('fermentação editar libera só PRO', () => {
    expect(
      mapa.codigosElegiveis(
        snap({ modulosEfetivos: { interno_fermentacao: 'editar' } }),
      ),
    ).toEqual(['PRO']);
  });

  it('forno + embalagem soma FOR e EMB', () => {
    expect(
      mapa.codigosElegiveis(
        snap({
          modulosEfetivos: {
            interno_forno: 'editar',
            interno_embalagem: 'administrar',
          },
        }),
      ),
    ).toEqual(['FOR', 'EMB']);
  });

  it('só ler produção não libera código', () => {
    expect(
      mapa.codigosElegiveis(
        snap({ modulosEfetivos: { interno_forno: 'ler' } }),
      ),
    ).toEqual([]);
  });

  it('dono do sistema libera os três códigos do mapa', () => {
    expect(mapa.codigosElegiveis(snap({ isSystemOwner: true }))).toEqual([
      'PRO',
      'FOR',
      'EMB',
    ]);
  });
});
