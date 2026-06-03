import { clientesService } from '@/lib/services/clientes-service';
import { SupabaseProductService } from '@/lib/services/products/supabase-product-service';
import { tiposEstoqueService } from '@/lib/services/tipos-estoque-service';

export class EstoqueResolverError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EstoqueResolverError';
  }
}

export class EstoqueResolverService {
  constructor(
    private readonly productService = new SupabaseProductService(),
  ) {}

  async resolveTipoEstoqueId(nome: string): Promise<string> {
    const tipo = await tiposEstoqueService.findByName(nome.trim());
    if (!tipo) {
      throw new EstoqueResolverError(`Tipo de estoque não encontrado: ${nome}`);
    }
    return tipo.id;
  }

  async resolveProdutoId(nome: string): Promise<string> {
    const produto = await this.productService.findByName(nome.trim());
    if (!produto) {
      throw new EstoqueResolverError(`Produto não encontrado: ${nome}`);
    }
    return produto.id;
  }

  async resolveTipoEstoqueFromCliente(cliente: string): Promise<string> {
    const clienteData = await clientesService.findByName(cliente);

    if (clienteData?.tipoEstoqueId) {
      const tipo = await tiposEstoqueService.findById(clienteData.tipoEstoqueId);
      if (tipo) {
        return tipo.id;
      }
    }

    if (clienteData) {
      let tipo = await tiposEstoqueService.findByName(clienteData.nomeFantasia);
      if (!tipo) {
        tipo = await tiposEstoqueService.findByName(clienteData.razaoSocial);
      }
      if (tipo) {
        return tipo.id;
      }
    }

    return this.resolveTipoEstoqueId(cliente);
  }

  async resolveTipoEstoqueNomeFromCliente(cliente: string): Promise<string> {
    const id = await this.resolveTipoEstoqueFromCliente(cliente);
    const tipo = await tiposEstoqueService.findById(id);
    if (!tipo) {
      throw new EstoqueResolverError(`Tipo de estoque não encontrado para cliente: ${cliente}`);
    }
    return tipo.nome;
  }
}

export const estoqueResolverService = new EstoqueResolverService();
