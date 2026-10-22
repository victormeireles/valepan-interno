import type { ReceitaWithRelations } from '@/app/actions/receitas-actions';

export type ReceitaFormDraft = {
  nome: string;
  tipo: ReceitaWithRelations['tipo'];
  ativo: boolean;
  ingredientes: Array<{
    insumoId: string;
    insumoNome: string;
    unidadeDescricao: string | null;
    custoUnitario: number | null;
    quantidade: number;
  }>;
  gramaturas: Array<{
    pesoG: number;
    quantidade: number;
  }>;
};

export class ReceitaDuplicataDraftBuilder {
  build(source: ReceitaWithRelations): ReceitaFormDraft {
    return {
      nome: `${source.nome} (cópia)`,
      tipo: source.tipo,
      ativo: true,
      ingredientes: (source.receita_ingredientes ?? []).map((item) => ({
        insumoId: item.insumo_id || '',
        insumoNome: item.insumos?.nome ?? 'Ingrediente',
        unidadeDescricao:
          item.insumos?.unidades?.nome_resumido ?? item.insumos?.unidades?.nome ?? null,
        custoUnitario: item.insumos?.custo_unitario ?? null,
        quantidade: item.quantidade_padrao,
      })),
      gramaturas: (source.receita_gramaturas ?? []).map((item) => ({
        pesoG: item.peso_g,
        quantidade: Number(item.quantidade_padrao),
      })),
    };
  }
}

export const receitaDuplicataDraftBuilder = new ReceitaDuplicataDraftBuilder();
