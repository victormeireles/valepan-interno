import { describe, expect, it } from 'vitest';
import { FaltaSetorTipoFiltro } from './falta-setor-tipo-filtro';

describe('FaltaSetorTipoFiltro', () => {
  const filtro = new FaltaSetorTipoFiltro();
  const itens = [
    { id: 'a', setorTipo: 'operacional' as const },
    { id: 'b', setorTipo: 'apoio' as const },
    { id: 'c', setorTipo: null },
  ];

  it('mantém tudo quando o tipo é todos', () => {
    expect(filtro.aplicar(itens, 'todos')).toEqual(itens);
  });

  it('separa operacional e apoio e deixa setor sem tipo de fora', () => {
    expect(filtro.aplicar(itens, 'operacional').map((item) => item.id)).toEqual(['a']);
    expect(filtro.aplicar(itens, 'apoio').map((item) => item.id)).toEqual(['b']);
  });
});
