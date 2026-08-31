import type {
  InsumoPedidoPipelineItem,
  InsumoPedidoPipelineResumo,
} from '@/domain/insumos/insumo-pedido-compra-types';
import { InsumoCompraDataReferenciaResolver } from '@/domain/insumos/insumo-compra-data-referencia-resolver';
import {
  insumoPedidoPipelineAgrupador,
  type InsumoPedidoPipelineAgrupador,
} from '@/domain/insumos/insumo-pedido-pipeline';
import { insumoPedidoCompraManager } from '@/lib/services/insumo-pedido-compra-manager';

type InsumoEstoquePipelineLoaderDependencies = {
  dataReferenciaResolver: Pick<InsumoCompraDataReferenciaResolver, 'resolve'>;
  listPipelineAberto: (dataReferencia: string) => Promise<InsumoPedidoPipelineItem[]>;
  pipelineAgrupador: Pick<InsumoPedidoPipelineAgrupador, 'agrupar'>;
};

const DEFAULT_DEPENDENCIES: InsumoEstoquePipelineLoaderDependencies = {
  dataReferenciaResolver: new InsumoCompraDataReferenciaResolver(),
  listPipelineAberto: (dataReferencia) =>
    insumoPedidoCompraManager.listarPipelineAberto(dataReferencia),
  pipelineAgrupador: insumoPedidoPipelineAgrupador,
};

/** Carrega `pipelinePorInsumo` para o dia civil atual em America/Sao_Paulo. */
export class InsumoEstoquePipelineLoader {
  private readonly dependencies: InsumoEstoquePipelineLoaderDependencies;

  constructor(dependencies: Partial<InsumoEstoquePipelineLoaderDependencies> = {}) {
    this.dependencies = { ...DEFAULT_DEPENDENCIES, ...dependencies };
  }

  async load(): Promise<Record<string, InsumoPedidoPipelineResumo>> {
    const hojeSp = this.dependencies.dataReferenciaResolver.resolve().isoDate;
    const pipelineItens = await this.dependencies.listPipelineAberto(hojeSp);
    return Object.fromEntries(this.dependencies.pipelineAgrupador.agrupar(pipelineItens));
  }
}

export const insumoEstoquePipelineLoader = new InsumoEstoquePipelineLoader();
