import { describe, expect, it } from 'vitest';
import { InternoAccessManager } from './interno-access-manager';
import { PerfilModulosResolver } from './perfil-modulos-resolver';

describe('PerfilModulosResolver', () => {
  it('mantém o nível máximo por módulo e ignora não-interno', () => {
    const resolved = new PerfilModulosResolver().resolve([
      { modulo: 'interno_fermentacao', nivel: 'ler' },
      { modulo: 'interno_fermentacao', nivel: 'editar' },
      { modulo: 'pedidos', nivel: 'administrar' },
    ]);
    expect(resolved).toEqual({ interno_fermentacao: 'editar' });
  });
});

describe('InternoAccessManager', () => {
  const manager = new InternoAccessManager();

  it('owner acessa app e qualquer módulo', () => {
    const snap = { isSystemOwner: true, identidades: ['interno'], modulosEfetivos: {} };
    expect(manager.podeAcessarApp(snap)).toBe(true);
    expect(manager.temModulo(snap, 'interno_config', 'administrar')).toBe(true);
  });

  it('sem módulo interno_* não acessa app', () => {
    const snap = {
      isSystemOwner: false,
      identidades: ['interno'],
      modulosEfetivos: {},
    };
    expect(manager.podeAcessarApp(snap)).toBe(false);
  });

  it('tablet fermentação edita fermentação e não administra config', () => {
    const snap = {
      isSystemOwner: false,
      identidades: ['interno'],
      modulosEfetivos: {
        interno_fermentacao: 'editar' as const,
        interno_painel: 'ler' as const,
      },
    };
    expect(manager.podeAcessarApp(snap)).toBe(true);
    expect(manager.temModulo(snap, 'interno_fermentacao', 'editar')).toBe(true);
    expect(manager.temModulo(snap, 'interno_config', 'administrar')).toBe(false);
  });
});
