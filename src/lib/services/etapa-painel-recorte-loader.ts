import {
  buildCategoriaPorProdutoMap,
} from '@/domain/categorias/filter-pedidos-embalagem-por-categoria';
import { RecorteVisivelEmbalagem } from '@/domain/categorias/recorte-visivel-embalagem';
import { categoriaVisibilidadeManager } from '@/domain/categorias/categoria-visibilidade-manager';
import type { OrdemProducaoRecord } from '@/domain/types/ordem-producao';
import { ordemProducaoRepository } from '@/data/producao/OrdemProducaoRepository';
import { SupabaseProductService } from '@/lib/services/products/supabase-product-service';

export type EtapaPainelRecorteResult = {
  visivelOrdemIds: Set<string>;
  extraOrdens: OrdemProducaoRecord[];
};

/**
 * Resolve quais OPs entram nos totais LT / tabela horária (mesmo recorte do fluxo).
 */
export class EtapaPainelRecorteLoader {
  constructor(private readonly productService = new SupabaseProductService()) {}

  async visivelOrdemIds(
    ordensConhecidas: OrdemProducaoRecord[],
    lotes: Array<{ ordemProducaoId: string }>,
  ): Promise<Set<string>> {
    return (await this.resolve(ordensConhecidas, lotes)).visivelOrdemIds;
  }

  async resolve(
    ordensConhecidas: OrdemProducaoRecord[],
    lotes: Array<{ ordemProducaoId: string }>,
  ): Promise<EtapaPainelRecorteResult> {
    const conhecidas = new Set(ordensConhecidas.map((ordem) => ordem.id));
    const missing = [
      ...new Set(lotes.map((lote) => lote.ordemProducaoId).filter((id) => !conhecidas.has(id))),
    ];
    const extraOrdens =
      missing.length > 0 ? await ordemProducaoRepository.findByIds(missing) : [];
    const todas = [...ordensConhecidas, ...extraOrdens];
    if (todas.length === 0) return { visivelOrdemIds: new Set(), extraOrdens: [] };

    const produtoIds = [...new Set(todas.map((ordem) => ordem.produtoId))];
    const [produtos, categoriasVisiveis] = await Promise.all([
      this.productService.findByIds(produtoIds),
      categoriaVisibilidadeManager.getIdsVisiveisEmbalagem(),
    ]);
    return {
      visivelOrdemIds: new RecorteVisivelEmbalagem(
        buildCategoriaPorProdutoMap(produtos),
        categoriasVisiveis,
      ).ordemIdsVisiveis(todas),
      extraOrdens,
    };
  }
}

export const etapaPainelRecorteLoader = new EtapaPainelRecorteLoader();
