'use server';

import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type {
  ProdutoCustoIngrediente,
  ProdutoCustoReceitaCatalogoItem,
  ProdutoCustoSimulacaoPayload,
  ProdutoCustoTipoReceita,
  ProdutoCustoVinculo,
} from '@/domain/produtos/produto-custo-unitario-types';

type ActionResult =
  | { success: true; data: ProdutoCustoSimulacaoPayload }
  | { success: false; error: string };

type InsumoJoin = {
  id: string;
  nome: string;
  custo_unitario: number | null;
  unidades: { nome: string; nome_resumido: string | null } | null;
};

type IngredienteJoin = {
  quantidade_padrao: number;
  insumo_id: string | null;
  insumos: InsumoJoin | null;
};

type ReceitaJoin = {
  id: string;
  nome: string;
  tipo: ProdutoCustoTipoReceita;
  ativo: boolean | null;
  receita_ingredientes?: IngredienteJoin[] | null;
};

export async function getProdutoCustoSimulacao(produtoId: string): Promise<ActionResult> {
  await requireInternoModulo('interno_config', 'administrar');
  const supabase = supabaseClientFactory.createServiceRoleClient();

  const { data: produto, error: produtoError } = await supabase
    .from('produtos')
    .select('id, nome')
    .eq('id', produtoId)
    .eq('ativo', true)
    .maybeSingle();

  if (produtoError || !produto) {
    return { success: false, error: 'Produto não encontrado.' };
  }

  const [{ data: vinculoRows, error: vinculoError }, { data: receitaRows, error: receitaError }] =
    await Promise.all([
      supabase
        .from('produto_receitas')
        .select(
          `
          receita_id,
          quantidade_por_produto,
          receitas!inner (
            id,
            nome,
            tipo,
            ativo
          )
        `,
        )
        .eq('produto_id', produtoId)
        .eq('ativo', true)
        .eq('receitas.ativo', true),
      supabase
        .from('receitas')
        .select(
          `
          id,
          nome,
          tipo,
          ativo,
          receita_ingredientes (
            quantidade_padrao,
            insumo_id,
            insumos (
              id,
              nome,
              custo_unitario,
              unidades!insumos_unidade_id_fkey (
                nome,
                nome_resumido
              )
            )
          )
        `,
        )
        .eq('ativo', true)
        .order('nome'),
    ]);

  if (vinculoError || receitaError) {
    console.error('Erro ao carregar simulador de custos', vinculoError || receitaError);
    return { success: false, error: 'Erro ao carregar dados do simulador.' };
  }

  const receitasCatalogo = (receitaRows ?? []).map(mapReceitaCatalogo);
  const receitaPorId = new Map(receitasCatalogo.map((item) => [item.id, item]));
  const vinculos = mapVinculos(vinculoRows ?? [], receitaPorId);

  return {
    success: true,
    data: {
      produto: { id: produto.id, nome: produto.nome },
      vinculos,
      receitasCatalogo,
    },
  };
}

function mapReceitaCatalogo(row: ReceitaJoin): ProdutoCustoReceitaCatalogoItem {
  return {
    id: row.id,
    nome: row.nome,
    tipo: row.tipo,
    ingredientes: (row.receita_ingredientes ?? [])
      .map(mapIngrediente)
      .filter((item): item is ProdutoCustoIngrediente => item != null),
  };
}

function mapIngrediente(row: IngredienteJoin): ProdutoCustoIngrediente | null {
  if (!row.insumos?.id) return null;
  return {
    insumoId: row.insumos.id,
    insumoNome: row.insumos.nome,
    unidade: row.insumos.unidades?.nome_resumido ?? row.insumos.unidades?.nome ?? null,
    quantidadePadrao: Number(row.quantidade_padrao),
    custoUnitario:
      row.insumos.custo_unitario == null ? null : Number(row.insumos.custo_unitario),
  };
}

function mapVinculos(
  rows: Array<{
    receita_id: string;
    quantidade_por_produto: number;
    receitas: Pick<ReceitaJoin, 'id' | 'nome' | 'tipo'> | null;
  }>,
  receitaPorId: Map<string, ProdutoCustoReceitaCatalogoItem>,
): ProdutoCustoVinculo[] {
  const vinculos: ProdutoCustoVinculo[] = [];
  for (const row of rows) {
    const receita = row.receitas ? receitaPorId.get(row.receitas.id) : undefined;
    if (!receita) continue;
    vinculos.push({
      tipo: receita.tipo,
      receitaId: receita.id,
      receitaNome: receita.nome,
      quantidadePorProduto: Number(row.quantidade_por_produto),
      ingredientes: receita.ingredientes,
    });
  }
  return vinculos;
}
