import {
  supabaseClientFactory,
  type SupabaseClientFactory,
} from '@/lib/clients/supabase-client-factory';

export type CategoriaVisibilidadeRow = {
  id: string;
  nome: string;
  visivel_embalagem: boolean;
  ativo: boolean;
};

export class CategoriaVisibilidadeManager {
  constructor(
    private readonly factory: SupabaseClientFactory = supabaseClientFactory,
  ) {}

  async getIdsVisiveisEmbalagem(): Promise<Set<string>> {
    const client = this.factory.createServiceRoleClient();
    const { data, error } = await client
      .from('categorias')
      .select('id, visivel_embalagem')
      .eq('ativo', true)
      .eq('visivel_embalagem', true);

    if (error) {
      throw new Error(`Erro ao buscar categorias visíveis: ${error.message}`);
    }

    return new Set((data ?? []).map((row) => row.id));
  }

  async listCategoriasAtivasComVisibilidade(): Promise<CategoriaVisibilidadeRow[]> {
    const client = this.factory.createServiceRoleClient();
    const { data, error } = await client
      .from('categorias')
      .select('id, nome, visivel_embalagem, ativo')
      .eq('ativo', true)
      .order('nome', { ascending: true });

    if (error) {
      throw new Error(`Erro ao listar categorias: ${error.message}`);
    }

    return (data ?? []) as CategoriaVisibilidadeRow[];
  }

  async updateVisivelEmbalagem(categoriaId: string, visivel: boolean): Promise<void> {
    const client = this.factory.createServiceRoleClient();
    const { error } = await client
      .from('categorias')
      .update({ visivel_embalagem: visivel })
      .eq('id', categoriaId);

    if (error) {
      throw new Error(`Erro ao atualizar visibilidade: ${error.message}`);
    }
  }
}

export const categoriaVisibilidadeManager = new CategoriaVisibilidadeManager();
