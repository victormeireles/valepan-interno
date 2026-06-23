import {
  supabaseClientFactory,
  type SupabaseClientFactory,
} from '@/lib/clients/supabase-client-factory';
import { isCategoriaSempreVisivelEmbalagem } from '@/domain/categorias/categoria-embalagem-visibilidade-rules';

export type CategoriaVisibilidadeRow = {
  id: string;
  nome: string;
  visivel_embalagem: boolean;
  ativo: boolean;
};

type CategoriaAtivaRow = {
  id: string;
  nome: string;
  visivel_embalagem: boolean;
  ativo: boolean;
};

export class CategoriaVisibilidadeManager {
  constructor(
    private readonly factory: SupabaseClientFactory = supabaseClientFactory,
  ) {}

  private async listCategoriasAtivasRaw(): Promise<CategoriaAtivaRow[]> {
    const client = this.factory.createServiceRoleClient();
    const withFlag = await client
      .from('categorias')
      .select('id, nome, visivel_embalagem, ativo')
      .eq('ativo', true)
      .order('nome', { ascending: true });

    if (!withFlag.error) {
      return (withFlag.data ?? []) as CategoriaAtivaRow[];
    }

    if (!withFlag.error.message.includes('visivel_embalagem')) {
      throw new Error(`Erro ao listar categorias: ${withFlag.error.message}`);
    }

    const fallback = await client
      .from('categorias')
      .select('id, nome, ativo')
      .eq('ativo', true)
      .order('nome', { ascending: true });

    if (fallback.error) {
      throw new Error(`Erro ao listar categorias: ${fallback.error.message}`);
    }

    return (fallback.data ?? []).map((row) => ({
      ...row,
      visivel_embalagem: false,
    }));
  }

  private resolveVisivelEmbalagem(nome: string, flag: boolean): boolean {
    return flag || isCategoriaSempreVisivelEmbalagem(nome);
  }

  async getIdsVisiveisEmbalagem(): Promise<Set<string>> {
    const categorias = await this.listCategoriasAtivasRaw();
    const ids = new Set<string>();

    for (const categoria of categorias) {
      if (this.resolveVisivelEmbalagem(categoria.nome, categoria.visivel_embalagem)) {
        ids.add(categoria.id);
      }
    }

    return ids;
  }

  async listCategoriasAtivasComVisibilidade(): Promise<CategoriaVisibilidadeRow[]> {
    const categorias = await this.listCategoriasAtivasRaw();
    return categorias.map((categoria) => ({
      ...categoria,
      visivel_embalagem: this.resolveVisivelEmbalagem(
        categoria.nome,
        categoria.visivel_embalagem,
      ),
    }));
  }

  async updateVisivelEmbalagem(categoriaId: string, visivel: boolean): Promise<void> {
    const client = this.factory.createServiceRoleClient();
    const { data: categoria, error: fetchError } = await client
      .from('categorias')
      .select('id, nome')
      .eq('id', categoriaId)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`Erro ao buscar categoria: ${fetchError.message}`);
    }
    if (!categoria) {
      throw new Error('Categoria não encontrada');
    }
    if (!visivel && isCategoriaSempreVisivelEmbalagem(categoria.nome)) {
      throw new Error('Hambúrguer e Hot Dog são sempre visíveis na embalagem');
    }

    const { error } = await client
      .from('categorias')
      .update({ visivel_embalagem: visivel })
      .eq('id', categoriaId);

    if (error) {
      if (error.message.includes('visivel_embalagem')) {
        throw new Error(
          'Coluna visivel_embalagem ainda não existe. Execute ADD_CATEGORIA_VISIVEL_EMBALAGEM.sql no Supabase.',
        );
      }
      throw new Error(`Erro ao atualizar visibilidade: ${error.message}`);
    }
  }

  /** Persiste visivel_embalagem=true para Hambúrguer e Hot Dog (idempotente). */
  async seedCategoriasSempreVisiveisEmbalagem(): Promise<string[]> {
    const client = this.factory.createServiceRoleClient();
    const categorias = await this.listCategoriasAtivasRaw();
    const alvo = categorias.filter((categoria) =>
      isCategoriaSempreVisivelEmbalagem(categoria.nome),
    );
    const atualizadas: string[] = [];

    for (const categoria of alvo) {
      if (categoria.visivel_embalagem) continue;

      const { error } = await client
        .from('categorias')
        .update({ visivel_embalagem: true })
        .eq('id', categoria.id);

      if (error) {
        if (error.message.includes('visivel_embalagem')) {
          throw new Error(
            'Coluna visivel_embalagem ainda não existe. Execute ADD_CATEGORIA_VISIVEL_EMBALAGEM.sql no Supabase.',
          );
        }
        throw new Error(`Erro ao atualizar ${categoria.nome}: ${error.message}`);
      }

      atualizadas.push(categoria.nome);
    }

    return atualizadas;
  }
}

export const categoriaVisibilidadeManager = new CategoriaVisibilidadeManager();
