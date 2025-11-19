import {
  InventarioLancamentoItem,
  InventarioLancamentoPayload,
  EstoqueDiff,
  EstoqueRecord,
  Quantidade,
} from '@/domain/types/inventario';
import { inventarioSheetManager } from '@/lib/managers/inventario-sheet-manager';
import { estoqueSheetManager } from '@/lib/managers/estoque-sheet-manager';

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
  }: AjusteQuantidadeInput): Promise<EstoqueRecord> {
    const estoqueAtual = await this.obterEstoqueCliente(cliente);
    const existente = estoqueAtual.find(
      (record) => record.produto === produto,
    );
    const quantidadeAtual = existente?.quantidade ?? this.criarQuantidadeZerada();
    const novaQuantidade = this.somarQuantidades(quantidadeAtual, delta);

    const atualizadoEm = new Date().toISOString();

    await estoqueSheetManager.upsertQuantidade(
      { cliente, produto },
      novaQuantidade,
      {
        atualizadoEm,
        inventarioAtualizadoEm: existente?.inventarioAtualizadoEm,
      },
    );

    return {
      cliente,
      produto,
      quantidade: novaQuantidade,
      inventarioAtualizadoEm: existente?.inventarioAtualizadoEm,
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
  ): Quantidade {
    const kgSomado = parseFloat((a.kg + (b.kg || 0)).toFixed(3));
    return {
      caixas: this.clampZero(a.caixas + (b.caixas || 0)),
      pacotes: this.clampZero(a.pacotes + (b.pacotes || 0)),
      unidades: this.clampZero(a.unidades + (b.unidades || 0)),
      kg: this.clampZero(kgSomado),
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

