import { EstoqueRecord, Quantidade } from '@/domain/types/inventario';
import type {
  EstoqueMovimentoOrigem,
  EstoqueMovimentoRecord,
  ListMovimentosFilters,
  ListSaldosOptions,
} from '@/domain/types/estoque-db';
import {
  aplicarDeltaComClamp,
  calcularDelta,
  criarQuantidadeZerada,
} from '@/domain/estoque/quantidade-calculo';
import { estoqueRepository } from '@/data/estoque/EstoqueRepository';
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
  embalagemLoteId?: string;
  clienteDestino?: string;
};

export class EstoqueService {
  public async obterEstoqueCliente(cliente: string): Promise<EstoqueRecord[]> {
    const saldos = await this.listarSaldosComFallback();
    const clienteNormalizado = cliente.trim();
    return saldos.filter((record) => record.cliente.trim() === clienteNormalizado);
  }

  public async obterTodosEstoques(
    options?: ListSaldosOptions,
  ): Promise<EstoqueRecord[]> {
    return this.listarSaldosComFallback(options);
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

  public async aplicarDelta({
    cliente,
    produto,
    delta,
    allowNegative = false,
    origem = 'ajuste_manual',
    embalagemLoteId,
    clienteDestino,
  }: RegistrarMovimentoByNomesInput): Promise<EstoqueRecord & { movimentoId: string }> {
    const tipoEstoqueId = await estoqueResolverService.resolveTipoEstoqueId(cliente);
    const produtoId = await estoqueResolverService.resolveProdutoId(produto);

    const { record, movimentoId } = await this.registrarMovimentoByIds({
      tipoEstoqueId,
      produtoId,
      tipoEstoqueNome: cliente,
      produtoNome: produto,
      delta,
      allowNegative,
      origem,
      embalagemLoteId,
      clienteDestino,
    });

    return { ...record, movimentoId };
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
    embalagemLoteId?: string;
    clienteDestino?: string;
  }): Promise<{ record: EstoqueRecord; movimentoId: string }> {
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

    const movimento = await estoqueRepository.insertMovimento({
      tipoEstoqueId: input.tipoEstoqueId,
      produtoId: input.produtoId,
      delta: input.delta,
      saldo,
      origem: input.origem,
      embalagemLoteId: input.embalagemLoteId ?? null,
      clienteDestino: input.clienteDestino ?? null,
    });

    await estoqueRepository.upsertSaldo(
      input.tipoEstoqueId,
      input.produtoId,
      saldo,
    );

    const atualizadoEm = new Date().toISOString();

    return {
      record: {
        cliente: input.tipoEstoqueNome,
        produto: input.produtoNome,
        quantidade: saldo,
        inventarioAtualizadoEm: saldoAtualRow?.updated_at,
        atualizadoEm,
      },
      movimentoId: movimento.id,
    };
  }

  private async listarSaldosComFallback(
    options?: ListSaldosOptions,
  ): Promise<EstoqueRecord[]> {
    const saldos = await estoqueRepository.listAllSaldos(options);
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
