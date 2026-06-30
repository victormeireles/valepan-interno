import { resolvePesoGramas } from '@/domain/assadeiras/produto-peso';
import { calcularQuantidadePorProdutoBrilho } from '@/domain/receitas/receita-brilho-calculo';
import {
  receitaTipoUsaGramaturaBrilho,
  receitaTipoUsaGramaturaDireta,
  resolverQuantidadePorGramatura,
  type ReceitaGramatura,
} from '@/domain/receitas/receita-gramatura-resolver';
import type { ReceitaMassaIngrediente } from '@/domain/receitas/receita-massa-calculo';
import type { Database } from '@/types/database';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

type TipoReceita = Database['public']['Enums']['tipo_receita'];

export type ReceitaGramaturaVinculoSyncResult = {
  atualizados: number;
  ignorados: Array<{ produtoNome: string; motivo: string }>;
};

type GramaturaDbRow = {
  peso_g: number;
  quantidade_padrao: number;
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

function unwrapJoin<T>(value: T | T[] | null): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapGramaturas(rows: GramaturaDbRow[]): ReceitaGramatura[] {
  return rows.map((row) => ({
    pesoG: row.peso_g,
    quantidade: Number(row.quantidade_padrao),
  }));
}

function mapIngredientes(rows: IngredienteDbRow[]): ReceitaMassaIngrediente[] {
  return rows.map((row) => ({
    quantidade: row.quantidade_padrao,
    unidade:
      row.insumos?.unidades?.nome_resumido ?? row.insumos?.unidades?.nome ?? null,
  }));
}

function resolverQuantidadeVinculo(
  tipo: TipoReceita,
  ingredientes: ReceitaMassaIngrediente[],
  gramaturas: ReceitaGramatura[],
  pesoGramas: number | null,
): number | null {
  if (!pesoGramas) return null;

  if (receitaTipoUsaGramaturaBrilho(tipo)) {
    const resultado = calcularQuantidadePorProdutoBrilho(ingredientes, gramaturas, pesoGramas);
    return resultado?.quantidade ?? null;
  }

  if (receitaTipoUsaGramaturaDireta(tipo)) {
    return resolverQuantidadePorGramatura(gramaturas, pesoGramas);
  }

  return null;
}

export class ReceitaGramaturaVinculosSyncManager {
  async syncByReceitaId(receitaId: string): Promise<ReceitaGramaturaVinculoSyncResult> {
    const supabase = supabaseClientFactory.createServiceRoleClient();

    const [
      { data: receita, error: receitaError },
      { data: gramaturasRows, error: gramaturasError },
      { data: ingredientesRows, error: ingredientesError },
      { data: vinculosRows, error: vinculosError },
    ] = await Promise.all([
      supabase.from('receitas').select('tipo').eq('id', receitaId).single(),
      supabase.from('receita_gramaturas').select('peso_g, quantidade_padrao').eq('receita_id', receitaId),
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

    if (receitaError) throw receitaError;
    if (gramaturasError) throw gramaturasError;
    if (ingredientesError) throw ingredientesError;
    if (vinculosError) throw vinculosError;

    const tipo = receita.tipo as TipoReceita;
    const gramaturas = mapGramaturas((gramaturasRows ?? []) as GramaturaDbRow[]);
    const ingredientes = mapIngredientes((ingredientesRows ?? []) as IngredienteDbRow[]);
    const vinculos = (vinculosRows ?? []) as VinculoDbRow[];

    if (gramaturas.length === 0 || vinculos.length === 0) {
      return { atualizados: 0, ignorados: [] };
    }

    let atualizados = 0;
    const ignorados: ReceitaGramaturaVinculoSyncResult['ignorados'] = [];

    for (const vinculo of vinculos) {
      const produto = unwrapJoin(vinculo.produtos);
      if (!produto) continue;

      const pesoGramas = resolvePesoGramas({
        unit_weight: produto.unit_weight,
        nome: produto.nome,
      });
      const quantidadeNova = resolverQuantidadeVinculo(tipo, ingredientes, gramaturas, pesoGramas);

      if (quantidadeNova == null) {
        ignorados.push({
          produtoNome: produto.nome,
          motivo: pesoGramas
            ? receitaTipoUsaGramaturaBrilho(tipo)
              ? `sem rendimento de brilho cadastrado para ${pesoGramas} g`
              : `sem quantidade cadastrada para ${pesoGramas} g`
            : 'gramatura do produto não encontrada',
        });
        continue;
      }

      if (vinculo.quantidade_por_produto === quantidadeNova) continue;

      const { error } = await supabase
        .from('produto_receitas')
        .update({ quantidade_por_produto: quantidadeNova })
        .eq('id', vinculo.id);

      if (error) throw error;
      atualizados += 1;
    }

    return { atualizados, ignorados };
  }
}

export const receitaGramaturaVinculosSyncManager = new ReceitaGramaturaVinculosSyncManager();
