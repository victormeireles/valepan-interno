import { describe, expect, it } from 'vitest';
import type { QuadroSetor } from './quadro-agrupamento';
import { QuadroSetorCatalogo } from './quadro-setor-catalogo';

describe('QuadroSetorCatalogo', () => {
  it('inclui setores vazios e ordena pelo catálogo', () => {
    const agrupados: QuadroSetor[] = [
      {
        setorNome: 'Forno',
        setorCodigo: '',
        ordem: 0,
        turnos: [],
        apoio: [],
        liderNome: null,
      },
    ];
    const setores = new QuadroSetorCatalogo().completar(agrupados, [
      { codigo: 'FOR', nome: 'Forno', ordem: 1 },
      { codigo: 'EMB', nome: 'Embalagem', ordem: 0 },
    ]);
    expect(setores.map((setor) => setor.setorCodigo)).toEqual(['EMB', 'FOR']);
    expect(setores[0]?.turnos).toEqual([]);
  });

  it('move um código na lista', () => {
    expect(new QuadroSetorCatalogo().mover(['A', 'B', 'C'], 2, 0)).toEqual(['C', 'A', 'B']);
  });
});
