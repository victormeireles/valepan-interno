import { ordemProducaoRepository } from '@/data/producao/OrdemProducaoRepository';
import { ordemProducaoEstimativaRepository } from '@/data/producao/OrdemProducaoEstimativaRepository';
import { metasMensaisProdutividadeRepository } from '@/data/producao/MetasMensaisProdutividadeRepository';
import { configOperacaoService } from '@/lib/services/config-operacao-service';
import { SupabaseProductService } from '@/lib/services/products/supabase-product-service';
import { categoriaVisibilidadeManager } from '@/domain/categorias/categoria-visibilidade-manager';
import {
  buildCategoriaPorProdutoMap,
  filterPedidosEmbalagemPorCategoriaVisivel,
} from '@/domain/categorias/filter-pedidos-embalagem-por-categoria';
import { EstimativaProducaoEngine } from '@/domain/estimativa-producao/estimativa-producao-engine';
import { estimativaProdutividadeResolver } from '@/domain/estimativa-producao/estimativa-producao-produtividade';
import type { ConfigOperacaoSnapshot } from '@/domain/config-operacao/config-operacao-types';
import type { OrdemProducaoRecord } from '@/domain/types/ordem-producao';
import type {
  EstimativaPersistRow,
  EstimativaProducaoParams,
  EstimativaProducaoRow,
  EstimativaProdutividadeMensal,
  EstimativaRecalcResult,
} from '@/domain/estimativa-producao/estimativa-producao-types';

export type EstimativaProducaoServiceDeps = {
  listByDataProducao: (date: string) => Promise<OrdemProducaoRecord[]>;
  listDataProducaoFrom: (fromDate: string) => Promise<string[]>;
  getConfig: () => Promise<ConfigOperacaoSnapshot>;
  listProdutividade: () => Promise<EstimativaProdutividadeMensal[]>;
  replaceForOrdens: (ordemIds: string[], rows: EstimativaPersistRow[]) => Promise<void>;
  deleteForOrdemIds: (ids: string[]) => Promise<void>;
  listByOrdemIds: (ids: string[]) => Promise<EstimativaProducaoRow[]>;
  filterOrdens?: (ordens: OrdemProducaoRecord[]) => Promise<OrdemProducaoRecord[]>;
};

async function filterOrdensVisiveisEmbalagem(
  ordens: OrdemProducaoRecord[],
): Promise<OrdemProducaoRecord[]> {
  if (ordens.length === 0) return [];
  const produtoIds = [...new Set(ordens.map((ordem) => ordem.produtoId))];
  const productService = new SupabaseProductService();
  const [produtos, visiveis] = await Promise.all([
    productService.findByIds(produtoIds),
    categoriaVisibilidadeManager.getIdsVisiveisEmbalagem(),
  ]);
  return filterPedidosEmbalagemPorCategoriaVisivel(
    ordens,
    buildCategoriaPorProdutoMap(produtos),
    visiveis,
  );
}

function createDefaultDeps(): EstimativaProducaoServiceDeps {
  return {
    listByDataProducao: (date) => ordemProducaoRepository.listByDataProducao(date),
    listDataProducaoFrom: (from) =>
      ordemProducaoEstimativaRepository.listDataProducaoFrom(from),
    getConfig: () => configOperacaoService.getConfig(),
    listProdutividade: () => metasMensaisProdutividadeRepository.listAll(),
    replaceForOrdens: (ids, rows) =>
      ordemProducaoEstimativaRepository.replaceForOrdens(ids, rows),
    deleteForOrdemIds: (ids) =>
      ordemProducaoEstimativaRepository.deleteForOrdemIds(ids),
    listByOrdemIds: (ids) => ordemProducaoEstimativaRepository.listByOrdemIds(ids),
    filterOrdens: filterOrdensVisiveisEmbalagem,
  };
}

export class EstimativaProducaoService {
  private readonly engine = new EstimativaProducaoEngine();
  private readonly deps: EstimativaProducaoServiceDeps;

  constructor(deps?: EstimativaProducaoServiceDeps) {
    this.deps = deps ?? createDefaultDeps();
  }

  async listByOrdemIds(ids: string[]): Promise<EstimativaProducaoRow[]> {
    return this.deps.listByOrdemIds(ids);
  }

  async resolveProdutividadeForDate(
    dataProducao: string,
  ): Promise<EstimativaProdutividadeMensal | null> {
    const rows = await this.deps.listProdutividade();
    return estimativaProdutividadeResolver.resolve(dataProducao.slice(0, 7), rows);
  }

  async recalcOpenDates(fromDate: string): Promise<void> {
    const dates = await this.deps.listDataProducaoFrom(fromDate);
    for (const date of dates) {
      await this.recalcForDate(date);
    }
  }

  async recalcForDate(dataProducao: string): Promise<EstimativaRecalcResult> {
    const allOrdens = await this.deps.listByDataProducao(dataProducao);
    if (allOrdens.length === 0) return { status: 'vazio' };

    const ids = allOrdens.map((ordem) => ordem.id);
    const ordens = this.deps.filterOrdens
      ? await this.deps.filterOrdens(allOrdens)
      : allOrdens;
    if (ordens.length === 0) {
      await this.deps.deleteForOrdemIds(ids);
      return { status: 'vazio' };
    }

    const produtividade = await this.resolveProdutividade(dataProducao);
    if (!produtividade) {
      await this.deps.deleteForOrdemIds(ids);
      return { status: 'sem_produtividade' };
    }

    const config = await this.deps.getConfig();
    const params = this.toParams(dataProducao, config, produtividade);
    const computed = this.engine.build({
      params,
      ordens: ordens.map((ordem) => ({
        id: ordem.id,
        ordemPlanejamento: ordem.ordemPlanejamento,
        assadeiras: ordem.assadeiras,
        caixas: ordem.quantidade.caixas,
      })),
    });

    const rows = computed.map((row) => this.toPersistRow(row, params));
    await this.deps.replaceForOrdens(ids, rows);
    return { status: 'ok' };
  }

  private async resolveProdutividade(
    dataProducao: string,
  ): Promise<EstimativaProdutividadeMensal | null> {
    const rows = await this.deps.listProdutividade();
    return estimativaProdutividadeResolver.resolve(dataProducao.slice(0, 7), rows);
  }

  private toParams(
    dataProducao: string,
    config: ConfigOperacaoSnapshot,
    produtividade: EstimativaProdutividadeMensal,
  ): EstimativaProducaoParams {
    return {
      dataProducao,
      horarioInicioProducao: config.horarioInicioProducao,
      horarioInicioForno: config.horarioInicioForno,
      horarioInicioEmbalagem: config.horarioInicioEmbalagem,
      tempoMedioFermentacaoMin: config.tempoMedioFermentacaoMin,
      tempoMedioResfriamentoMin: config.tempoMedioResfriamentoMin,
      taxaAssadeirasHoraProducao: produtividade.taxaAssadeirasHoraProducao,
      taxaAssadeirasHoraForno: produtividade.taxaAssadeirasHoraForno,
      taxaCaixasHoraEmbalagem: produtividade.taxaCaixasHoraEmbalagem,
    };
  }

  private toPersistRow(
    row: EstimativaProducaoRow,
    params: EstimativaProducaoParams,
  ): EstimativaPersistRow {
    return {
      ...row,
      taxaAssadeirasHoraProducao: params.taxaAssadeirasHoraProducao,
      taxaAssadeirasHoraForno: params.taxaAssadeirasHoraForno,
      taxaCaixasHoraEmbalagem: params.taxaCaixasHoraEmbalagem,
      tempoMedioFermentacaoMin: params.tempoMedioFermentacaoMin,
      tempoMedioResfriamentoMin: params.tempoMedioResfriamentoMin,
    };
  }
}

export const estimativaProducaoService = new EstimativaProducaoService();
