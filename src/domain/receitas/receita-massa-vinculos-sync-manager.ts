import {
  resolverAtualizacoesVinculoMassa,
  type VinculoMassaParaSync,
} from '@/domain/receitas/receita-massa-vinculos-resolver';
import type { ReceitaMassaIngrediente } from '@/domain/receitas/receita-massa-calculo';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

export type { VinculoMassaParaSync } from '@/domain/receitas/receita-massa-vinculos-resolver';

export type ReceitaMassaVinculoSyncResult = {
  atualizados: number;
  ignorados: Array<{ produtoNome: string; motivo: string }>;
};

export type ReceitaMassaBackfillItem = {
  receitaId: string;
  receitaNome: string;
  produtoNome: string;
  vinculoId: string;
  quantidadeAtual: number;
  quantidadeNova: number;
};

export type ReceitaMassaBackfillResult = {
  receitasProcessadas: number;
  atualizados: number;
  inalterados: number;
  ignorados: Array<{ receitaNome: string; produtoNome: string; motivo: string }>;
  mudancas: ReceitaMassaBackfillItem[];
};

type IngredienteDbRow = {
  quantidade_padrao: number;
  insumos: {
    unidades: { nome_resumido: string | null; nome: string | null } | null;
  } | null;
};

type VinculoDbRow = {
  id: string;
  quantidade_por_produto: number;
  produtos: { nome: string; unit_weight: number | null } | null;
};

type ReceitaMassaRow = {
  id: string;
  nome: string;
};

function unwrapJoin<T>(value: T | T[] | null): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapIngredientesDb(rows: IngredienteDbRow[]): ReceitaMassaIngrediente[] {
  return rows.map((row) => ({
    quantidade: row.quantidade_padrao,
    unidade:
      row.insumos?.unidades?.nome_resumido ?? row.insumos?.unidades?.nome ?? null,
  }));
}

function mapVinculosDb(rows: VinculoDbRow[]): Array<
  VinculoMassaParaSync & { quantidadeAtual: number }
> {
  return rows
    .map((row) => {
      const produto = unwrapJoin(row.produtos);
      if (!produto) return null;
      return {
        vinculoId: row.id,
        produtoNome: produto.nome,
        unit_weight: produto.unit_weight,
        quantidadeAtual: row.quantidade_por_produto,
      };
    })
    .filter((item): item is VinculoMassaParaSync & { quantidadeAtual: number } => item != null);
}

export class ReceitaMassaVinculosSyncManager {
  async syncByReceitaId(receitaId: string): Promise<ReceitaMassaVinculoSyncResult> {
    const resultado = await this.backfillReceita(receitaId, { dryRun: false });
    return {
      atualizados: resultado.atualizados,
      ignorados: resultado.ignorados.map((item) => ({
        produtoNome: item.produtoNome,
        motivo: item.motivo,
      })),
    };
  }

  async backfillAllMassa(options?: { dryRun?: boolean }): Promise<ReceitaMassaBackfillResult> {
    const supabase = supabaseClientFactory.createServiceRoleClient();
    const dryRun = options?.dryRun ?? false;

    const { data: receitas, error } = await supabase
      .from('receitas')
      .select('id, nome')
      .eq('tipo', 'massa')
      .eq('ativo', true)
      .order('nome');

    if (error) throw error;

    const agregado: ReceitaMassaBackfillResult = {
      receitasProcessadas: 0,
      atualizados: 0,
      inalterados: 0,
      ignorados: [],
      mudancas: [],
    };

    for (const receita of (receitas ?? []) as ReceitaMassaRow[]) {
      const resultado = await this.backfillReceita(receita.id, {
        dryRun,
        receitaNome: receita.nome,
      });
      agregado.receitasProcessadas += 1;
      agregado.atualizados += resultado.atualizados;
      agregado.inalterados += resultado.inalterados;
      agregado.ignorados.push(...resultado.ignorados);
      agregado.mudancas.push(...resultado.mudancas);
    }

    return agregado;
  }

  private async backfillReceita(
    receitaId: string,
    options: { dryRun: boolean; receitaNome?: string },
  ): Promise<ReceitaMassaBackfillResult> {
    const supabase = supabaseClientFactory.createServiceRoleClient();
    const receitaNome = options.receitaNome ?? receitaId;

    const [{ data: ingredientesRows, error: ingredientesError }, { data: vinculosRows, error: vinculosError }] =
      await Promise.all([
        supabase
          .from('receita_ingredientes')
          .select(`
            quantidade_padrao,
            insumos (
              unidades (
                nome_resumido,
                nome
              )
            )
          `)
          .eq('receita_id', receitaId),
        supabase
          .from('produto_receitas')
          .select(`
            id,
            quantidade_por_produto,
            produtos (
              nome,
              unit_weight
            )
          `)
          .eq('receita_id', receitaId)
          .eq('ativo', true),
      ]);

    if (ingredientesError) throw ingredientesError;
    if (vinculosError) throw vinculosError;

    const ingredientes = mapIngredientesDb((ingredientesRows ?? []) as IngredienteDbRow[]);
    const vinculos = mapVinculosDb((vinculosRows ?? []) as VinculoDbRow[]);

    if (vinculos.length === 0) {
      return {
        receitasProcessadas: 0,
        atualizados: 0,
        inalterados: 0,
        ignorados: [],
        mudancas: [],
      };
    }

    const { atualizacoes, ignorados } = resolverAtualizacoesVinculoMassa(ingredientes, vinculos);
    const quantidadeAtualPorVinculo = new Map(
      vinculos.map((item) => [item.vinculoId, item.quantidadeAtual]),
    );

    const mudancas: ReceitaMassaBackfillItem[] = [];
    let atualizados = 0;
    let inalterados = 0;

    for (const item of atualizacoes) {
      const quantidadeAtual = quantidadeAtualPorVinculo.get(item.vinculoId) ?? 0;
      const vinculo = vinculos.find((entry) => entry.vinculoId === item.vinculoId);
      const produtoNome = vinculo?.produtoNome ?? 'Produto';

      if (quantidadeAtual === item.quantidade) {
        inalterados += 1;
        continue;
      }

      mudancas.push({
        receitaId,
        receitaNome,
        produtoNome,
        vinculoId: item.vinculoId,
        quantidadeAtual,
        quantidadeNova: item.quantidade,
      });

      if (!options.dryRun) {
        const { error: updateError } = await supabase
          .from('produto_receitas')
          .update({ quantidade_por_produto: item.quantidade })
          .eq('id', item.vinculoId);

        if (updateError) throw updateError;
      }

      atualizados += 1;
    }

    return {
      receitasProcessadas: 1,
      atualizados,
      inalterados,
      ignorados: ignorados.map((item) => ({
        receitaNome,
        produtoNome: item.produtoNome,
        motivo: item.motivo,
      })),
      mudancas,
    };
  }
}

export const receitaMassaVinculosSyncManager = new ReceitaMassaVinculosSyncManager();
