import { describe, expect, it } from 'vitest';
import { ProdutoFamiliaOptionsMapper } from './ProdutoFamiliaOptionsMapper';
import { mapProdutoFromGenericOption } from '@/components/Etiquetas/etiqueta-prefill-loader';

describe('ProdutoFamiliaOptionsMapper', () => {
  const mapper = new ProdutoFamiliaOptionsMapper();
  const produto = { produto_familias: { nome_exibicao: 'Hot Dog Big' } };

  it('expõe apenas o nome relacionado quando o vínculo é solicitado', () => {
    expect(mapper.select(['produto_familia_id'])).toBe(', produto_familias(nome_exibicao)');
    expect(mapper.metadata(produto, ['produto_familia_id'])).toEqual({ familiaNome: 'Hot Dog Big' });
    expect(mapper.select([])).toBe('');
    expect(mapper.metadata(produto, [])).toEqual({});
  });

  it('propaga família ausente e presente até o preenchimento do modal', () => {
    expect(mapper.metadata({}, ['produto_familia_id'])).toEqual({ familiaNome: null });
    const input = mapProdutoFromGenericOption({
      value: 'id', label: 'Produto', meta: mapper.metadata(produto, ['produto_familia_id']),
    });
    expect(input.familiaNome).toBe('Hot Dog Big');
  });
});
