import type { Quantidade } from '@/domain/types/inventario';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type { Database } from '@/types/database';

export interface InventarioItemInput {
  produtoId: string;
  quantidade: Quantidade;
}

export interface CreateInventarioInput {
  data: string;
  tipoEstoqueId: string;
  itens: InventarioItemInput[];
}

export class InventarioRepository {
  private readonly supabase = supabaseClientFactory.createServiceRoleClient();

  async create(input: CreateInventarioInput): Promise<{ inventarioId: string }> {
    const { data: header, error: headerError } = await this.supabase
      .from('inventario_lancamentos')
      .insert({
        data: input.data,
        tipo_estoque_id: input.tipoEstoqueId,
      })
      .select('id')
      .single();

    if (headerError) {
      throw new Error(`Erro ao criar inventário: ${headerError.message}`);
    }

    if (input.itens.length === 0) {
      return { inventarioId: header.id };
    }

    const rows: Database['public']['Tables']['inventario_lancamento_itens']['Insert'][] =
      input.itens.map((item) => ({
        inventario_id: header.id,
        produto_id: item.produtoId,
        caixas: item.quantidade.caixas,
        pacotes: item.quantidade.pacotes,
        unidades: item.quantidade.unidades,
        kg: item.quantidade.kg,
      }));

    const { error: itemsError } = await this.supabase
      .from('inventario_lancamento_itens')
      .insert(rows);

    if (itemsError) {
      throw new Error(`Erro ao criar itens de inventário: ${itemsError.message}`);
    }

    return { inventarioId: header.id };
  }
}

export const inventarioRepository = new InventarioRepository();
