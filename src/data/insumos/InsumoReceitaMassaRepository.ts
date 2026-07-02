import { assadeiraResolver } from '@/domain/assadeiras/assadeira-resolver';
import type {
  InsumoReceitaMassaContexto,
  InsumoReceitaProducaoContexto,
  InsumoReceitaTipoContexto,
} from '@/domain/insumos/insumo-consumo-producao-types';
import { resolveModoQuantidadeEtapa } from '@/domain/producao-etapa/etapa-quantidade';
import type { TipoReceita } from '@/domain/receitas/receita-gramatura-resolver';
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

function normalizarIngredientes(
  raw: ReceitaIngredienteRow[] | ReceitaIngredienteRow | null,
): { insumoId: string; quantidadePadrao: number }[] {
  const lista = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return lista
    .filter((item) => item.insumo_id)
    .map((item) => ({
      insumoId: item.insumo_id as string,
      quantidadePadrao: Number(item.quantidade_padrao),
    }));
}

function extrairReceita(raw: ReceitaJoin | ReceitaJoin[] | null): ReceitaJoin | null {
  const receita = Array.isArray(raw) ? raw[0] : raw;
  if (!receita || receita.ativo === false) return null;
  return receita;
}

export class InsumoReceitaMassaRepository {
  private get supabase() {
    return supabaseClientFactory.createServiceRoleClient();
  }

  private async resolverProdutoNome(produtoId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('produtos')
      .select('id, nome')
      .eq('id', produtoId)
      .maybeSingle();
    if (error || !data) return null;
    return data.nome;
  }

  private async resolverUnidadesPorAssadeira(
    ordem: OrdemProducaoRecord,
  ): Promise<number | null> {
    const modo = resolveModoQuantidadeEtapa(ordem.assadeiraId);
    if (modo !== 'assadeiras') return null;
    const vinculos = await assadeiraResolver.resolveForProduto(ordem.produtoId);
    const match = vinculos.find((v) => v.assadeira_id === ordem.assadeiraId) ?? vinculos[0];
    return match?.unidades_efetivas ?? null;
  }

  private async carregarVinculosPorTipos(
    produtoId: string,
    tipos: TipoReceita[],
  ): Promise<VinculoRow[]> {
    const { data, error } = await this.supabase
      .from('produto_receitas')
      .select(`
        quantidade_por_produto,
        receitas!inner (
          id,
          tipo,
          ativo,
          receita_ingredientes (
            insumo_id,
            quantidade_padrao
          )
        )
      `)
      .eq('produto_id', produtoId)
      .eq('ativo', true);

    if (error || !data) return [];

    const tiposPermitidos = new Set<TipoReceita>(tipos);
    return (data as unknown as VinculoRow[]).filter((vinculo) => {
      const receita = extrairReceita(vinculo.receitas);
      return receita !== null && tiposPermitidos.has(receita.tipo as TipoReceita);
    });
  }

  /** Contexto da receita de massa (fermentação). Mantido para a fase 2a. */
  async loadContexto(ordem: OrdemProducaoRecord): Promise<InsumoReceitaMassaContexto | null> {
    const produtoNome = await this.resolverProdutoNome(ordem.produtoId);
    if (!produtoNome) return null;

    const vinculos = await this.carregarVinculosPorTipos(ordem.produtoId, ['massa']);
    const vinculo = vinculos[0];
    if (!vinculo) return null;

    const receita = extrairReceita(vinculo.receitas);
    if (!receita) return null;

    return {
      produtoNome,
      quantidadePorProduto: Number(vinculo.quantidade_por_produto),
      ingredientes: normalizarIngredientes(receita.receita_ingredientes),
      unidadesPorAssadeira: await this.resolverUnidadesPorAssadeira(ordem),
    };
  }

  /**
   * Contexto de consumo por múltiplos tipos de receita (forno: brilho+confeito;
   * embalagem: antimofo+embalagem+caixa). Retorna null se o produto não existir
   * ou não tiver nenhuma das receitas solicitadas.
   */
  async loadContextoProducao(
    ordem: OrdemProducaoRecord,
    tipos: TipoReceita[],
  ): Promise<InsumoReceitaProducaoContexto | null> {
    const contexto = await this.loadContextoProducaoPorProduto(ordem.produtoId, tipos);
    if (!contexto) return null;
    return { ...contexto, unidadesPorAssadeira: await this.resolverUnidadesPorAssadeira(ordem) };
  }

  /**
   * Igual a `loadContextoProducao`, mas sem resolver unidades por assadeira
   * (usado pela embalagem, que não trabalha com assadeiras).
   */
  async loadContextoProducaoPorProduto(
    produtoId: string,
    tipos: TipoReceita[],
  ): Promise<InsumoReceitaProducaoContexto | null> {
    const produtoNome = await this.resolverProdutoNome(produtoId);
    if (!produtoNome) return null;

    const vinculos = await this.carregarVinculosPorTipos(produtoId, tipos);

    const receitas: InsumoReceitaTipoContexto[] = [];
    for (const vinculo of vinculos) {
      const receita = extrairReceita(vinculo.receitas);
      if (!receita) continue;
      receitas.push({
        tipo: receita.tipo as TipoReceita,
        quantidadePorProduto: Number(vinculo.quantidade_por_produto),
        ingredientes: normalizarIngredientes(receita.receita_ingredientes),
      });
    }

    if (receitas.length === 0) return null;

    return { produtoNome, unidadesPorAssadeira: null, receitas };
  }
}

export const insumoReceitaMassaRepository = new InsumoReceitaMassaRepository();
