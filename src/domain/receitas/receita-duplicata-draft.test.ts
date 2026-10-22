import { describe, expect, it } from 'vitest';
import { receitaDuplicataDraftBuilder } from '@/domain/receitas/receita-duplicata-draft';
import type { ReceitaWithRelations } from '@/app/actions/receitas-actions';

function buildSource(overrides: Partial<ReceitaWithRelations> = {}): ReceitaWithRelations {
  return {
    id: 'rec-1',
    nome: 'Massa Brioche',
    tipo: 'massa',
    ativo: true,
    created_at: null,
    receita_ingredientes: [
      {
        id: 'ing-1',
        quantidade_padrao: 10,
        insumo_id: 'ins-1',
        insumos: {
          id: 'ins-1',
          nome: 'Farinha',
          custo_unitario: 1.5,
          unidade_id: 'u-1',
          unidades: {
            id: 'u-1',
            nome: 'Quilo',
            nome_resumido: 'kg',
            codigo: 'KG',
          },
        },
      },
    ],
    receita_gramaturas: [{ id: 'g-1', peso_g: 90, quantidade_padrao: 100 }],
    produto_receitas: [],
    ...overrides,
  };
}

describe('ReceitaDuplicataDraftBuilder', () => {
  it('gera rascunho com sufixo (cópia) sem ids de origem', () => {
    const draft = receitaDuplicataDraftBuilder.build(buildSource());

    expect(draft.nome).toBe('Massa Brioche (cópia)');
    expect(draft.tipo).toBe('massa');
    expect(draft.ativo).toBe(true);
    expect(draft.ingredientes).toEqual([
      {
        insumoId: 'ins-1',
        insumoNome: 'Farinha',
        unidadeDescricao: 'kg',
        custoUnitario: 1.5,
        quantidade: 10,
      },
    ]);
    expect(draft.gramaturas).toEqual([{ pesoG: 90, quantidade: 100 }]);
  });
});
