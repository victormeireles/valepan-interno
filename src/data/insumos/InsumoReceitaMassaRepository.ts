import { assadeiraResolver } from '@/domain/assadeiras/assadeira-resolver';
import type { InsumoReceitaMassaContexto } from '@/domain/insumos/insumo-consumo-producao-types';
import { resolveModoQuantidadeEtapa } from '@/domain/producao-etapa/etapa-quantidade';
import type { OrdemProducaoRecord } from '@/domain/types/ordem-producao';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

type ReceitaIngredienteRow = {
  insumo_id: string | null;
  quantidade_padrao: number;
};

type ReceitaJoin = {
  id: string;
  tipo: string;
  ativo: boolean | null;
  receita_ingredientes: ReceitaIngredienteRow[] | ReceitaIngredienteRow | null;
};

type VinculoRow = {
  quantidade_por_produto: number;
  receitas: ReceitaJoin | ReceitaJoin[] | null;
};

export class InsumoReceitaMassaRepository {
  async loadContexto(ordem: OrdemProducaoRecord): Promise<InsumoReceitaMassaContexto | null> {
    const supabase = supabaseClientFactory.createServiceRoleClient();

    const { data: produto, error: produtoError } = await supabase
      .from('produtos')
      .select('id, nome')
      .eq('id', ordem.produtoId)
      .maybeSingle();

    if (produtoError || !produto) return null;

    const { data: vinculo, error: vinculoError } = await supabase
      .from('produto_receitas')
      .select(`
        quantidade_por_produto,
        receitas (
          id,
          tipo,
          ativo,
          receita_ingredientes (
            insumo_id,
            quantidade_padrao
          )
        )
      `)
      .eq('produto_id', ordem.produtoId)
      .eq('tipo', 'massa')
      .eq('ativo', true)
      .maybeSingle();

    if (vinculoError || !vinculo) return null;

    const row = vinculo as VinculoRow;
    const receitaRaw = row.receitas;
    const receita = Array.isArray(receitaRaw) ? receitaRaw[0] : receitaRaw;
    if (!receita || receita.ativo === false) return null;

    const ingredientesRaw = receita.receita_ingredientes;
    const ingredientesList = Array.isArray(ingredientesRaw)
      ? ingredientesRaw
      : ingredientesRaw
        ? [ingredientesRaw]
        : [];

    const ingredientes = ingredientesList
      .filter((item) => item.insumo_id)
      .map((item) => ({
        insumoId: item.insumo_id as string,
        quantidadePadrao: Number(item.quantidade_padrao),
      }));

    let unidadesPorAssadeira: number | null = null;
    const modo = resolveModoQuantidadeEtapa(ordem.assadeiraId);
    if (modo === 'assadeiras') {
      const vinculos = await assadeiraResolver.resolveForProduto(ordem.produtoId);
      const match =
        vinculos.find((v) => v.assadeira_id === ordem.assadeiraId) ?? vinculos[0];
      unidadesPorAssadeira = match?.unidades_efetivas ?? null;
    }

    return {
      produtoNome: produto.nome,
      quantidadePorProduto: Number(row.quantidade_por_produto),
      ingredientes,
      unidadesPorAssadeira,
    };
  }
}

export const insumoReceitaMassaRepository = new InsumoReceitaMassaRepository();
