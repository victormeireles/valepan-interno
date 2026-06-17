import { buildPainelOrdem } from '@/domain/producao-etapa/painel-ordem-builder';
import type { PainelEtapaResponse } from '@/domain/types/painel-etapa';
import type { OrdemProducaoRecord } from '@/domain/types/ordem-producao';
import type { FermentacaoLoteRecord } from '@/domain/types/fermentacao-lote';
import { fornoLoteRepository } from '@/data/producao-etapa/FornoLoteRepository';
import { ordemProducaoRepository } from '@/data/producao/OrdemProducaoRepository';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { SupabaseProductService } from '@/lib/services/products/supabase-product-service';
import { tiposEstoqueService } from '@/lib/services/tipos-estoque-service';

type AssadeiraRow = { id: string; nome: string };

export class PainelFornoService {
  constructor(
    private readonly productService = new SupabaseProductService(),
  ) {}

  async getPainelForDate(date: string): Promise<PainelEtapaResponse> {
    const ordens = await ordemProducaoRepository.listByDataProducao(date);
    if (ordens.length === 0) {
      return { date, ordens: [] };
    }

    const ids = ordens.map((o) => o.id);
    const [lotesByOrdem, names] = await Promise.all([
      fornoLoteRepository.listByOrdemProducaoIds(ids),
      this.loadNameMaps(ordens),
    ]);

    const ordensPainel = ordens.map((ordem) =>
      buildPainelOrdem({
        ordem,
        lotes: (lotesByOrdem.get(ordem.id) ?? []) as FermentacaoLoteRecord[],
        produto: names.produtoNomeById.get(ordem.produtoId) ?? 'Desconhecido',
        tipoEstoque: names.tipoNomeById.get(ordem.tipoEstoqueId) ?? 'Desconhecido',
        assadeiraNome: ordem.assadeiraId
          ? names.assadeiraNomeById.get(ordem.assadeiraId)
          : undefined,
      }),
    );

    return { date, ordens: ordensPainel };
  }

  private async loadNameMaps(ordens: OrdemProducaoRecord[]) {
    const tipoIds = [...new Set(ordens.map((o) => o.tipoEstoqueId))];
    const produtoIds = [...new Set(ordens.map((o) => o.produtoId))];
    const assadeiraIds = [...new Set(ordens.map((o) => o.assadeiraId).filter(Boolean))];

    const [tipos, produtos, assadeiras] = await Promise.all([
      tiposEstoqueService.findByIds(tipoIds),
      this.productService.findByIds(produtoIds),
      this.loadAssadeiraNames(assadeiraIds),
    ]);

    return {
      tipoNomeById: new Map(tipos.map((t) => [t.id, t.nome])),
      produtoNomeById: new Map(produtos.map((p) => [p.id, p.nome])),
      assadeiraNomeById: new Map(assadeiras.map((a) => [a.id, a.nome])),
    };
  }

  private async loadAssadeiraNames(ids: string[]): Promise<AssadeiraRow[]> {
    if (ids.length === 0) return [];

    const supabase = supabaseClientFactory.createServiceRoleClient();
    const { data, error } = await supabase
      .from('assadeiras')
      .select('id, nome')
      .in('id', ids);

    if (error) {
      throw new Error(`Erro ao buscar assadeiras: ${error.message}`);
    }

    return (data ?? []) as AssadeiraRow[];
  }
}

export const painelFornoService = new PainelFornoService();
