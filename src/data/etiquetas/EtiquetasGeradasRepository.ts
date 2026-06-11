import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

export type EtiquetaGeradaRecord = {
  id: string;
  ordemProducaoId: string | null;
  produtoId: string;
  tipoEstoqueId: string;
  dataFabricacao: string;
  modo: 'pedido' | 'manual';
  geradoEm: string;
};

export class EtiquetasGeradasRepository {
  private readonly supabase = supabaseClientFactory.createServiceRoleClient();

  async findByOrdemProducaoIds(ids: string[]): Promise<Map<string, EtiquetaGeradaRecord>> {
    const map = new Map<string, EtiquetaGeradaRecord>();
    if (ids.length === 0) return map;
    const { data, error } = await this.supabase
      .from('etiquetas_geradas')
      .select('*')
      .in('ordem_producao_id', ids);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      if (!row.ordem_producao_id) continue;
      map.set(row.ordem_producao_id, {
        id: row.id,
        ordemProducaoId: row.ordem_producao_id,
        produtoId: row.produto_id,
        tipoEstoqueId: row.tipo_estoque_id,
        dataFabricacao: row.data_fabricacao,
        modo: row.modo as 'pedido' | 'manual',
        geradoEm: row.gerado_em,
      });
    }
    return map;
  }

  async insert(input: Omit<EtiquetaGeradaRecord, 'id' | 'geradoEm'> & { geradoPor?: string | null }): Promise<void> {
    const { error } = await this.supabase.from('etiquetas_geradas').insert({
      ordem_producao_id: input.ordemProducaoId,
      produto_id: input.produtoId,
      tipo_estoque_id: input.tipoEstoqueId,
      data_fabricacao: input.dataFabricacao,
      modo: input.modo,
      gerado_por: input.geradoPor ?? null,
    });
    if (error) throw new Error(error.message);
  }
}

export const etiquetasGeradasRepository = new EtiquetasGeradasRepository();
