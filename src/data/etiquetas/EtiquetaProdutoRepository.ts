import { supabaseClientFactory, type SupabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type { ProdutoPesoInput } from '@/domain/assadeiras/produto-peso';
import type {
  EtiquetaProdutoRecord, EtiquetaProdutoRepositoryPort, GerarEtiquetaRequest,
} from '@/domain/etiquetas/etiqueta-geracao-types';

const PRODUTO_SELECT = 'id, nome, nome_etiqueta, categoria_id, unit_weight, dias_validade_ambiente, unit_barcode, box_units, package_units, categorias(nome), produto_familias(nome_exibicao)';

export class EtiquetaProdutoRepository implements EtiquetaProdutoRepositoryPort {
  constructor(private readonly factory: Pick<SupabaseClientFactory, 'createServiceRoleClient'> = supabaseClientFactory) {}

  async findProduto(input: Pick<GerarEtiquetaRequest, 'produtoId' | 'produto'>):
    Promise<EtiquetaProdutoRecord | null> {
    const query = this.factory.createServiceRoleClient()
      .from('produtos').select(PRODUTO_SELECT).eq('ativo', true);
    const filtro = input.produtoId
      ? query.eq('id', input.produtoId)
      : query.ilike('nome', this.escapeLike(input.produto ?? ''));
    const { data: produto, error } = await filtro.limit(1).maybeSingle();
    if (error) throw new Error(`Erro ao buscar produto: ${error.message}`);
    if (!produto) return null;
    return {
      id: produto.id,
      nome: produto.nome,
      nomeEtiqueta: produto.nome_etiqueta,
      categoriaId: produto.categoria_id,
      categoriaNome: produto.categorias?.nome ?? null,
      familiaNome: produto.produto_familias?.nome_exibicao ?? null,
      unit_weight: produto.unit_weight,
      diasValidadeAmbiente: produto.dias_validade_ambiente,
      codigoBarras: produto.unit_barcode,
      unidadesPorCaixa: produto.box_units,
      unidadesPorPacote: produto.package_units,
    };
  }

  async listPesosCategoria(categoriaId: string): Promise<ProdutoPesoInput[]> {
    const { data: produtos, error } = await this.factory.createServiceRoleClient()
      .from('produtos').select('nome, unit_weight')
      .eq('categoria_id', categoriaId).eq('ativo', true);
    if (error) throw new Error(`Erro ao buscar gramaturas: ${error.message}`);
    return produtos ?? [];
  }

  private escapeLike(nome: string): string {
    return nome.replace(/[\\%_]/g, '\\$&');
  }
}
