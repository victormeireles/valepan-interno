import { describe, expect, it } from 'vitest';
import { resolvePesoGramas } from './produto-peso';

describe('resolvePesoGramas', () => {
  it('usa unit_weight em gramas quando >= 10', () => {
    expect(resolvePesoGramas({ unit_weight: 65, nome: 'HB Brioche 65g' })).toBe(65);
  });

  it('converte unit_weight em kg quando < 10', () => {
    expect(resolvePesoGramas({ unit_weight: 0.065, nome: 'HB Brioche 65g' })).toBe(65);
  });

  it('extrai gramatura do nome quando unit_weight null', () => {
    expect(resolvePesoGramas({ unit_weight: null, nome: 'HB Brioche 65g' })).toBe(65);
  });

  it('retorna null sem peso e sem gramatura no nome', () => {
    expect(resolvePesoGramas({ unit_weight: null, nome: 'HB Gergelim' })).toBeNull();
  });
});
