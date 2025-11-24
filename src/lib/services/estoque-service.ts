import {
  InventarioLancamentoItem,
  InventarioLancamentoPayload,
  EstoqueDiff,
  EstoqueRecord,
  Quantidade,
} from '@/domain/types/inventario';
import { inventarioSheetManager } from '@/lib/managers/inventario-sheet-manager';
import { estoqueSheetManager } from '@/lib/managers/estoque-sheet-manager';
import { clientesService } from './clientes-service';
import { tiposEstoqueService } from './tipos-estoque-service';

type AjusteQuantidadeInput = {
  cliente: string;
  produto: string;
  delta: Quantidade;
};

export class EstoqueService {
  public async obterEstoqueCliente(cliente: string): Promise<EstoqueRecord[]> {
    return estoqueSheetManager.listByCliente(cliente);
  }

  public async obterTodosEstoques(): Promise<EstoqueRecord[]> {
    return estoqueSheetManager.listAll();
  }

  public async obterTipoEstoqueCliente(cliente: string): Promise<string | null> {
    // Buscar o cliente pelo nome
    const clienteData = await clientesService.findByName(cliente);
    
    if (!clienteData) {
      return null;
    }

    // Se o cliente tem tipo_estoque_id, buscar o tipo de estoque pelo ID
    if (clienteData.tipoEstoqueId) {
      const tipoEstoque = await tiposEstoqueService.findById(clienteData.tipoEstoqueId);
      if (tipoEstoque) {
        return tipoEstoque.nome;
      }
    }

    // Fallback: tentar encontrar tipo de estoque pelo nome_fantasia
    let tipoEstoque = await tiposEstoqueService.findByName(clienteData.nomeFantasia);
    
    // Se não encontrar, tentar por razao_social
    if (!tipoEstoque) {
      tipoEstoque = await tiposEstoqueService.findByName(clienteData.razaoSocial);
    }

    return tipoEstoque?.nome ?? null;
  }

  public async clientePossuiEtiqueta(cliente: string): Promise<boolean> {
    try {
      // Primeiro, tentar buscar diretamente pelo nome do cliente como tipo de estoque
      // (caso comum onde o nome do cliente corresponde ao nome do tipo de estoque)
      let tipoEstoque = await tiposEstoqueService.findByName(cliente);
      
      if (tipoEstoque) {
        return tipoEstoque.possuiEtiqueta;
      }

      // Se não encontrou, buscar o cliente pelo nome
      const clienteData = await clientesService.findByName(cliente);
      
      if (!clienteData) {
        return false;
      }

      // Se o cliente tem tipo_estoque_id, buscar o tipo de estoque pelo ID
      if (clienteData.tipoEstoqueId) {
        tipoEstoque = await tiposEstoqueService.findById(clienteData.tipoEstoqueId);
        if (tipoEstoque) {
          return tipoEstoque.possuiEtiqueta;
        }
      }

      // Tentar encontrar tipo de estoque pelo nome_fantasia
      if (!tipoEstoque) {
        tipoEstoque = await tiposEstoqueService.findByName(clienteData.nomeFantasia);
      }
      
      // Se não encontrar, tentar por razao_social
      if (!tipoEstoque) {
        tipoEstoque = await tiposEstoqueService.findByName(clienteData.razaoSocial);
      }

      // Retornar true apenas se o tipo de estoque existir e possui_etiqueta for true
      return tipoEstoque?.possuiEtiqueta ?? false;
    } catch (_error) {
      return false;
    }
  }

  public async avaliarInventario(
    cliente: string,
    itens: InventarioLancamentoItem[],
  ): Promise<{
    estoqueAtual: EstoqueRecord[];
    diffs: EstoqueDiff[];
    produtosNaoInformados: string[];
  }> {
    const estoqueAtual = await this.obterEstoqueCliente(cliente);
    const diffs = this.calcularDiffs(estoqueAtual, itens);
    const produtosInformados = new Set(itens.map((item) => item.produto));
    const produtosNaoInformados = estoqueAtual
      .filter((record) => !produtosInformados.has(record.produto))
      .map((record) => record.produto);

    return { estoqueAtual, diffs, produtosNaoInformados };
  }

  public async aplicarInventario(
    payload: InventarioLancamentoPayload,
  ): Promise<{
    diffs: EstoqueDiff[];
    estoqueAtualizado: EstoqueRecord[];
  }> {
    const avaliacao = await this.avaliarInventario(
      payload.cliente,
      payload.itens,
    );
    const atualizadoEm = new Date().toISOString();

    const itensComZeros = this.completarItensComZeros(
      avaliacao.estoqueAtual,
      payload.itens,
    );
    const inventarioAtualizadoEm = atualizadoEm;

    await estoqueSheetManager.replaceClienteEstoque(
      payload.cliente,
      itensComZeros.map((item) => ({
        produto: item.produto,
        quantidade: item.quantidade,
      })),
      {
        inventarioAtualizadoEm,
        atualizadoEm,
      },
    );

    await inventarioSheetManager.registrarInventario(
      payload.data,
      payload.cliente,
      payload.itens,
    );

    const estoqueAtualizado = await this.obterEstoqueCliente(payload.cliente);
    return { diffs: avaliacao.diffs, estoqueAtualizado };
  }

  public async aplicarDelta({
    cliente,
    produto,
    delta,
    allowNegative = false,
  }: AjusteQuantidadeInput & { allowNegative?: boolean }): Promise<EstoqueRecord> {
    const estoqueAtual = await this.obterEstoqueCliente(cliente);
    const produtoNormalizado = produto.trim();
    const existente = estoqueAtual.find(
      (record) => record.produto.trim() === produtoNormalizado,
    );
    const quantidadeAtual = existente?.quantidade ?? this.criarQuantidadeZerada();
    const novaQuantidade = this.somarQuantidades(quantidadeAtual, delta, allowNegative);

    const atualizadoEm = new Date().toISOString();

    await estoqueSheetManager.upsertQuantidade(
      { cliente, produto },
      novaQuantidade,
      {
        atualizadoEm,
        inventarioAtualizadoEm: existente?.inventarioAtualizadoEm ?? atualizadoEm,
      },
    );

    return {
      cliente,
      produto,
      quantidade: novaQuantidade,
      inventarioAtualizadoEm: existente?.inventarioAtualizadoEm ?? atualizadoEm,
      atualizadoEm,
    };
  }

  private calcularDiffs(
    estoqueAtual: EstoqueRecord[],
    itens: InventarioLancamentoItem[],
  ): EstoqueDiff[] {
    const mapaAtual = new Map(
      estoqueAtual.map((record) => [record.produto, record.quantidade]),
    );
    const diffs: EstoqueDiff[] = [];

    itens.forEach((item) => {
      const anterior = mapaAtual.get(item.produto);
      diffs.push({
        produto: item.produto,
        anterior,
        novo: item.quantidade,
      });
      mapaAtual.delete(item.produto);
    });

    mapaAtual.forEach((quantidade, produto) => {
      diffs.push({
        produto,
        anterior: quantidade,
        novo: this.criarQuantidadeZerada(),
      });
    });

    return diffs;
  }

  private completarItensComZeros(
    estoqueAtual: EstoqueRecord[],
    itens: InventarioLancamentoItem[],
  ): InventarioLancamentoItem[] {
    const produtosInformados = new Set(itens.map((item) => item.produto));
    const itensComZeros = [...itens];

    estoqueAtual.forEach((record) => {
      if (!produtosInformados.has(record.produto)) {
        itensComZeros.push({
          produto: record.produto,
          quantidade: this.criarQuantidadeZerada(),
        });
      }
    });

    return itensComZeros;
  }

  private somarQuantidades(
    a: Quantidade,
    b: Quantidade,
    allowNegative = false,
  ): Quantidade {
    const kgSomado = parseFloat((a.kg + (b.kg || 0)).toFixed(3));
    const caixas = a.caixas + (b.caixas || 0);
    const pacotes = a.pacotes + (b.pacotes || 0);
    const unidades = a.unidades + (b.unidades || 0);
    
    return {
      caixas: allowNegative ? caixas : this.clampZero(caixas),
      pacotes: allowNegative ? pacotes : this.clampZero(pacotes),
      unidades: allowNegative ? unidades : this.clampZero(unidades),
      kg: allowNegative ? kgSomado : this.clampZero(kgSomado),
    };
  }

  private clampZero(value: number): number {
    return value < 0 ? 0 : value;
  }

  private criarQuantidadeZerada(): Quantidade {
    return { caixas: 0, pacotes: 0, unidades: 0, kg: 0 };
  }
}

export const estoqueService = new EstoqueService();

