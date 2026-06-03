import {
  InventarioLancamentoItem,
  InventarioLancamentoPayload,
  EstoqueDiff,
  EstoqueRecord,
  Quantidade,
} from '@/domain/types/inventario';
import type {
  EstoqueMovimentoOrigem,
  EstoqueMovimentoRecord,
  ListMovimentosFilters,
} from '@/domain/types/estoque-db';
import {
  aplicarDeltaComClamp,
  calcularDelta,
  criarQuantidadeZerada,
} from '@/domain/estoque/quantidade-calculo';
import { estoqueRepository } from '@/data/estoque/EstoqueRepository';
import { inventarioRepository } from '@/data/estoque/InventarioRepository';
import { inventarioSheetManager } from '@/lib/managers/inventario-sheet-manager';
import { estoqueSheetManager } from '@/lib/managers/estoque-sheet-manager';
import { clientesService } from './clientes-service';
import { tiposEstoqueService } from './tipos-estoque-service';
import {
  estoqueResolverService,
  EstoqueResolverError,
} from './estoque-resolver-service';

type AjusteQuantidadeInput = {
  cliente: string;
  produto: string;
  delta: Quantidade;
};

type AtualizarQuantidadeInput = {
  cliente: string;
  produto: string;
  quantidade: Quantidade;
};

type RegistrarMovimentoByNomesInput = AjusteQuantidadeInput & {
  allowNegative?: boolean;
  origem?: EstoqueMovimentoOrigem;
};

export class EstoqueService {
  public async obterEstoqueCliente(cliente: string): Promise<EstoqueRecord[]> {
    const saldos = await this.listarSaldosComFallback();
    const clienteNormalizado = cliente.trim();
    return saldos.filter((record) => record.cliente.trim() === clienteNormalizado);
  }

  public async obterTodosEstoques(): Promise<EstoqueRecord[]> {
    return this.listarSaldosComFallback();
  }

  public async listarMovimentos(
    filters: ListMovimentosFilters,
  ): Promise<EstoqueMovimentoRecord[]> {
    return estoqueRepository.listMovimentos(filters);
  }

  public async obterTipoEstoqueCliente(cliente: string): Promise<string | null> {
    const clienteData = await clientesService.findByName(cliente);

    if (!clienteData) {
      return null;
    }

    if (clienteData.tipoEstoqueId) {
      const tipoEstoque = await tiposEstoqueService.findById(clienteData.tipoEstoqueId);
      if (tipoEstoque) {
        return tipoEstoque.nome;
      }
    }

    let tipoEstoque = await tiposEstoqueService.findByName(clienteData.nomeFantasia);

    if (!tipoEstoque) {
      tipoEstoque = await tiposEstoqueService.findByName(clienteData.razaoSocial);
    }

    return tipoEstoque?.nome ?? null;
  }

  public async clientePossuiEtiqueta(cliente: string): Promise<boolean> {
    try {
      let tipoEstoque = await tiposEstoqueService.findByName(cliente);

      if (tipoEstoque) {
        return tipoEstoque.possuiEtiqueta;
      }

      const clienteData = await clientesService.findByName(cliente);

      if (!clienteData) {
        return false;
      }

      if (clienteData.tipoEstoqueId) {
        tipoEstoque = await tiposEstoqueService.findById(clienteData.tipoEstoqueId);
        if (tipoEstoque) {
          return tipoEstoque.possuiEtiqueta;
        }
      }

      if (!tipoEstoque) {
        tipoEstoque = await tiposEstoqueService.findByName(clienteData.nomeFantasia);
      }

      if (!tipoEstoque) {
        tipoEstoque = await tiposEstoqueService.findByName(clienteData.razaoSocial);
      }

      return tipoEstoque?.possuiEtiqueta ?? false;
    } catch {
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
    const avaliacao = await this.avaliarInventario(payload.cliente, payload.itens);
    const tipoEstoqueId = await estoqueResolverService.resolveTipoEstoqueId(payload.cliente);

    const itensComZeros = this.completarItensComZeros(avaliacao.estoqueAtual, payload.itens);

    const itensResolvidos = await Promise.all(
      itensComZeros.map(async (item) => ({
        produtoId: await estoqueResolverService.resolveProdutoId(item.produto),
        produtoNome: item.produto,
        quantidade: item.quantidade,
      })),
    );

    await inventarioRepository.create({
      data: payload.data,
      tipoEstoqueId,
      itens: itensResolvidos.map((item) => ({
        produtoId: item.produtoId,
        quantidade: item.quantidade,
      })),
    });

    for (const item of itensResolvidos) {
      const saldoAtual = await estoqueRepository.findSaldo(tipoEstoqueId, item.produtoId);
      const quantidadeAtual = saldoAtual
        ? {
            caixas: saldoAtual.caixas,
            pacotes: saldoAtual.pacotes,
            unidades: saldoAtual.unidades,
            kg: Number(saldoAtual.kg),
          }
        : criarQuantidadeZerada();

      const delta = calcularDelta(quantidadeAtual, item.quantidade);
      const houveMudanca =
        delta.caixas !== 0 ||
        delta.pacotes !== 0 ||
        delta.unidades !== 0 ||
        delta.kg !== 0;

      if (!houveMudanca) continue;

      await this.registrarMovimentoByIds({
        tipoEstoqueId,
        produtoId: item.produtoId,
        tipoEstoqueNome: payload.cliente,
        produtoNome: item.produtoNome,
        delta,
        origem: 'inventario',
      });
    }

    const atualizadoEm = new Date().toISOString();
    await estoqueSheetManager.replaceClienteEstoque(
      payload.cliente,
      itensComZeros.map((item) => ({
        produto: item.produto,
        quantidade: item.quantidade,
      })),
      {
        inventarioAtualizadoEm: atualizadoEm,
        atualizadoEm,
      },
    );

    try {
      await inventarioSheetManager.registrarInventario(
        payload.data,
        payload.cliente,
        payload.itens,
      );
    } catch (error) {
      console.error('[EstoqueService] Falha dual-write inventário planilha:', error);
    }

    const estoqueAtualizado = await this.obterEstoqueCliente(payload.cliente);
    return { diffs: avaliacao.diffs, estoqueAtualizado };
  }

  public async aplicarDelta({
    cliente,
    produto,
    delta,
    allowNegative = false,
    origem = 'ajuste_manual',
  }: RegistrarMovimentoByNomesInput): Promise<EstoqueRecord> {
    const tipoEstoqueId = await estoqueResolverService.resolveTipoEstoqueId(cliente);
    const produtoId = await estoqueResolverService.resolveProdutoId(produto);

    const record = await this.registrarMovimentoByIds({
      tipoEstoqueId,
      produtoId,
      tipoEstoqueNome: cliente,
      produtoNome: produto,
      delta,
      allowNegative,
      origem,
    });

    return record;
  }

  public async definirQuantidadeAbsoluta({
    cliente,
    produto,
    quantidade,
  }: AtualizarQuantidadeInput): Promise<EstoqueRecord> {
    const estoqueAtual = await this.obterEstoqueCliente(cliente);
    const existente = estoqueAtual.find((record) => record.produto === produto);
    const quantidadeAtual = existente?.quantidade ?? criarQuantidadeZerada();
    const quantidadeNormalizada = this.normalizarQuantidade(quantidade);
    const delta = calcularDelta(quantidadeAtual, quantidadeNormalizada);

    return this.aplicarDelta({
      cliente,
      produto,
      delta,
      origem: 'ajuste_manual',
    });
  }

  private async registrarMovimentoByIds(input: {
    tipoEstoqueId: string;
    produtoId: string;
    tipoEstoqueNome: string;
    produtoNome: string;
    delta: Quantidade;
    allowNegative?: boolean;
    origem: EstoqueMovimentoOrigem;
  }): Promise<EstoqueRecord> {
    const saldoAtualRow = await estoqueRepository.findSaldo(
      input.tipoEstoqueId,
      input.produtoId,
    );

    const quantidadeAtual = saldoAtualRow
      ? {
          caixas: saldoAtualRow.caixas,
          pacotes: saldoAtualRow.pacotes,
          unidades: saldoAtualRow.unidades,
          kg: Number(saldoAtualRow.kg),
        }
      : criarQuantidadeZerada();

    const { saldo } = aplicarDeltaComClamp(
      quantidadeAtual,
      input.delta,
      input.allowNegative ?? false,
    );

    await estoqueRepository.insertMovimento({
      tipoEstoqueId: input.tipoEstoqueId,
      produtoId: input.produtoId,
      delta: input.delta,
      saldo,
      origem: input.origem,
    });

    await estoqueRepository.upsertSaldo(
      input.tipoEstoqueId,
      input.produtoId,
      saldo,
    );

    const atualizadoEm = new Date().toISOString();

    try {
      await estoqueSheetManager.upsertQuantidade(
        { cliente: input.tipoEstoqueNome, produto: input.produtoNome },
        saldo,
        {
          atualizadoEm,
          inventarioAtualizadoEm: saldoAtualRow?.updated_at ?? atualizadoEm,
        },
      );
    } catch (error) {
      console.error('[EstoqueService] Falha dual-write estoque planilha:', error);
    }

    return {
      cliente: input.tipoEstoqueNome,
      produto: input.produtoNome,
      quantidade: saldo,
      inventarioAtualizadoEm: saldoAtualRow?.updated_at,
      atualizadoEm,
    };
  }

  private async listarSaldosComFallback(): Promise<EstoqueRecord[]> {
    const count = await estoqueRepository.countSaldos();

    if (count === 0) {
      return estoqueSheetManager.listAll();
    }

    const saldos = await estoqueRepository.listAllSaldos();
    return saldos.map((saldo) => ({
      cliente: saldo.tipoEstoqueNome,
      produto: saldo.produtoNome,
      quantidade: saldo.quantidade,
      atualizadoEm: saldo.updatedAt,
      tipoEstoqueId: saldo.tipoEstoqueId,
      produtoId: saldo.produtoId,
      produtoFamiliaId: saldo.produtoFamiliaId,
      produtoFamiliaNome: saldo.produtoFamiliaNome,
      produtoFamiliaImagemUrl: saldo.produtoFamiliaImagemUrl,
      ordemFamilia: saldo.ordemFamilia,
      ordemNaFamilia: saldo.ordemNaFamilia,
    }));
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
        novo: criarQuantidadeZerada(),
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
          quantidade: criarQuantidadeZerada(),
        });
      }
    });

    return itensComZeros;
  }

  private normalizarQuantidade(quantidade: Quantidade): Quantidade {
    const normalizarInteiro = (valor: number | undefined): number => {
      if (!Number.isFinite(valor)) {
        return 0;
      }
      return Math.max(0, Math.trunc(valor ?? 0));
    };

    const normalizarKg = (valor: number | undefined): number => {
      if (!Number.isFinite(valor)) {
        return 0;
      }
      const kg = parseFloat((valor ?? 0).toFixed(3));
      return Math.max(0, kg);
    };

    return {
      caixas: normalizarInteiro(quantidade.caixas),
      pacotes: normalizarInteiro(quantidade.pacotes),
      unidades: normalizarInteiro(quantidade.unidades),
      kg: normalizarKg(quantidade.kg),
    };
  }
}

export { EstoqueResolverError };
export const estoqueService = new EstoqueService();
