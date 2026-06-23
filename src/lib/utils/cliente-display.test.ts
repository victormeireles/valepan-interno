import { describe, expect, it } from 'vitest';
import { getClienteInicial, resolveTipoEstoqueMarca, shouldOmitClienteMetaEmbalagem } from './cliente-display';

describe('getClienteInicial', () => {
  it('retorna a primeira letra maiúscula', () => {
    expect(getClienteInicial('Damiao')).toBe('D');
  });

  it('ignora espaços nas bordas', () => {
    expect(getClienteInicial('  HB  ')).toBe('H');
  });

  it('retorna ? para nome vazio', () => {
    expect(getClienteInicial('')).toBe('?');
    expect(getClienteInicial('   ')).toBe('?');
  });
});

describe('resolveTipoEstoqueMarca', () => {
  it('retorna marca para Damião e Top Alto', () => {
    expect(resolveTipoEstoqueMarca('Damiao')).toEqual({ letra: 'D', label: 'Damiao' });
    expect(resolveTipoEstoqueMarca('Damião')).toEqual({ letra: 'D', label: 'Damião' });
    expect(resolveTipoEstoqueMarca('Top Alto')).toEqual({ letra: 'T', label: 'Top Alto' });
  });

  it('não retorna marca para Valepan nem clientes genéricos', () => {
    expect(resolveTipoEstoqueMarca('Valepan')).toBeNull();
    expect(resolveTipoEstoqueMarca('Da Casa')).toBeNull();
    expect(resolveTipoEstoqueMarca('')).toBeNull();
    expect(resolveTipoEstoqueMarca(undefined)).toBeNull();
  });
});

describe('shouldOmitClienteMetaEmbalagem', () => {
  it('omite Valepan na meta inline', () => {
    expect(shouldOmitClienteMetaEmbalagem('Valepan')).toBe(true);
    expect(shouldOmitClienteMetaEmbalagem('valepan')).toBe(true);
  });

  it('mantém outros clientes na meta', () => {
    expect(shouldOmitClienteMetaEmbalagem('Damiao')).toBe(false);
    expect(shouldOmitClienteMetaEmbalagem('Top Alto')).toBe(false);
  });
});
