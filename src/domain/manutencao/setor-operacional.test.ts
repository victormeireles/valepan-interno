import { describe, expect, it } from 'vitest';
import { SetorOperacional, type SetorLinha } from './setor-operacional';

describe('SetorOperacional', () => {
  const regra = new SetorOperacional();

  it('aceita operacional ativo', () => {
    expect(regra.elegivel({ tipo: 'operacional', ativo: true })).toBe(true);
  });

  it('recusa operacional inativo, apoio ativo e apoio inativo', () => {
    expect(regra.elegivel({ tipo: 'operacional', ativo: false })).toBe(false);
    expect(regra.elegivel({ tipo: 'apoio', ativo: true })).toBe(false);
    expect(regra.elegivel({ tipo: 'apoio', ativo: false })).toBe(false);
  });

  it('filtra só o operacional ativo', () => {
    const setores: SetorLinha[] = [
      { id: '1', nome: 'Forno', tipo: 'operacional', ativo: true },
      { id: '2', nome: 'Massa', tipo: 'operacional', ativo: false },
      { id: '3', nome: 'Almoxarifado', tipo: 'apoio', ativo: true },
      { id: '4', nome: 'Limpeza', tipo: 'apoio', ativo: false },
    ];

    expect(regra.filtrar(setores)).toEqual([setores[0]]);
  });
});
