import type { InsumoReceitaMassaIngrediente } from '@/domain/insumos/insumo-consumo-producao-types';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

export class TipoEstoqueReceitaCaixaRepository {
  private get supabase() {
    return supabaseClientFactory.createServiceRoleClient();
  }

  async loadIngredientes(
    tipoEstoqueId: string,
  ): Promise<InsumoReceitaMassaIngrediente[] | null> {
    const { data: tipo, error: tipoError } = await this.supabase
      .from('tipos_estoque')
      .select('receita_caixa_id')
      .eq('id', tipoEstoqueId)
      .maybeSingle();
    if (tipoError) throw new Error(`Erro ao ler exceção de caixa: ${tipoError.message}`);
    if (!tipo?.receita_caixa_id) return null;

    const { data: itens, error } = await this.supabase
      .from('receita_ingredientes')
      .select('insumo_id, quantidade_padrao')
      .eq('receita_id', tipo.receita_caixa_id);
    if (error) throw new Error(`Erro ao ler ingredientes da caixa: ${error.message}`);

    return (itens ?? [])
      .filter((item) => item.insumo_id)
      .map((item) => ({
        insumoId: item.insumo_id as string,
        quantidadePadrao: Number(item.quantidade_padrao),
      }));
  }
}

export const tipoEstoqueReceitaCaixaRepository = new TipoEstoqueReceitaCaixaRepository();
