import { describe, expect, it } from 'vitest';
import { resolverCnpjUnicoDoGrupo } from './insumo-fornecedor-cnpj-grupo';
import type { InsumoPendenciaGrupoContexto } from './insumo-pendencia-grupo-contexto';

function ctx(fornecedores: InsumoPendenciaGrupoContexto['fornecedores']): InsumoPendenciaGrupoContexto {
  return {
    fornecedores,
    fornecedoresDistintos: fornecedores.length,
    fornecedorTitulo: fornecedores[0]?.label ?? '—',
    fornecedorSubtitulo: null,
    categorias: [],
    categoriasDistintas: 0,
    categoriaTitulo: null,
    categoriaSubtitulo: null,
    cfop: null,
    ncm: null,
  };
}

describe('resolverCnpjUnicoDoGrupo', () => {
  it('retorna CNPJ normalizado quando há um único fornecedor com CNPJ', () => {
    expect(
      resolverCnpjUnicoDoGrupo({
        contexto: ctx([{ chave: '11.725.898/0001-81', label: 'HIG', pendenciaCount: 2 }]),
      }),
    ).toBe('11725898000181');
  });

  it('retorna null sem CNPJ ou com múltiplos', () => {
    expect(
      resolverCnpjUnicoDoGrupo({
        contexto: ctx([{ chave: 'HIG E LIMP', label: 'HIG E LIMP', pendenciaCount: 1 }]),
      }),
    ).toBeNull();
    expect(
      resolverCnpjUnicoDoGrupo({
        contexto: ctx([
          { chave: '11725898000181', label: 'A', pendenciaCount: 1 },
          { chave: '22333444000155', label: 'B', pendenciaCount: 1 },
        ]),
      }),
    ).toBeNull();
  });
});
