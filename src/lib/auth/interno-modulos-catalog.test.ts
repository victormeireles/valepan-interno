import { describe, expect, it } from 'vitest';
import {
  MODULOS_INTERNO,
  isModuloInterno,
  nivelAtende,
} from './interno-modulos-catalog';

describe('interno-modulos-catalog', () => {
  it('lista exatamente os 11 módulos interno_*', () => {
    expect(MODULOS_INTERNO).toHaveLength(11);
    expect(MODULOS_INTERNO).toContain('interno_reclamacoes');
    expect(MODULOS_INTERNO.every((m) => m.startsWith('interno_'))).toBe(true);
  });

  it('isModuloInterno distingue catálogo', () => {
    expect(isModuloInterno('interno_fermentacao')).toBe(true);
    expect(isModuloInterno('pedidos')).toBe(false);
  });

  it('nivelAtende respeita ordem ler < editar < administrar', () => {
    expect(nivelAtende('administrar', 'ler')).toBe(true);
    expect(nivelAtende('ler', 'editar')).toBe(false);
    expect(nivelAtende(undefined, 'ler')).toBe(false);
  });
});
