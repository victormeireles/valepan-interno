import { SupabaseClient } from '@supabase/supabase-js';
import type { InsumoFornecedorIgnoradoRow } from '@/domain/types/insumo-estoque-db';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type { Database } from '@/types/database';

export class InsumoFornecedorIgnoradoRepository {
  constructor(
    private readonly supabase: SupabaseClient<Database> = supabaseClientFactory.createServiceRoleClient(),
  ) {}

  private get db(): SupabaseClient {
    return this.supabase as unknown as SupabaseClient;
  }

  async listAll(): Promise<InsumoFornecedorIgnoradoRow[]> {
    const { data, error } = await this.db
      .from('insumo_fornecedor_ignorado')
      .select('*')
      .order('criado_em', { ascending: false });

    if (error) {
      throw new Error(`Erro ao listar fornecedores ignorados: ${error.message}`);
    }

    return (data as InsumoFornecedorIgnoradoRow[]) ?? [];
  }

  async existsByCnpj(empresaId: string, cnpjDigits: string): Promise<boolean> {
    const { count, error } = await this.db
      .from('insumo_fornecedor_ignorado')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', empresaId)
      .eq('fornecedor_cnpj', cnpjDigits);

    if (error) {
      throw new Error(`Erro ao verificar fornecedor ignorado: ${error.message}`);
    }

    return (count ?? 0) > 0;
  }

  async upsert(input: {
    empresaId: string;
    cnpjDigits: string;
    nome?: string | null;
    razao?: string | null;
    criadoPor?: string | null;
  }): Promise<InsumoFornecedorIgnoradoRow> {
    const { data, error } = await this.db
      .from('insumo_fornecedor_ignorado')
      .upsert(
        {
          empresa_id: input.empresaId,
          fornecedor_cnpj: input.cnpjDigits,
          fornecedor_nome: input.nome ?? null,
          fornecedor_razao_social: input.razao ?? null,
          criado_por: input.criadoPor ?? null,
        },
        { onConflict: 'empresa_id,fornecedor_cnpj' },
      )
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao marcar fornecedor ignorado: ${error.message}`);
    }

    return data as InsumoFornecedorIgnoradoRow;
  }

  async deleteByCnpj(empresaId: string, cnpjDigits: string): Promise<void> {
    const { error } = await this.db
      .from('insumo_fornecedor_ignorado')
      .delete()
      .eq('empresa_id', empresaId)
      .eq('fornecedor_cnpj', cnpjDigits);

    if (error) {
      throw new Error(`Erro ao remover fornecedor ignorado: ${error.message}`);
    }
  }
}

export const insumoFornecedorIgnoradoRepository = new InsumoFornecedorIgnoradoRepository();
