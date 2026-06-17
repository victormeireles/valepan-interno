import {
  formatOrdemQuantidadeLabel,
  resolveModoQuantidade,
} from '@/domain/ordens-producao/ordem-quantidade-label';
import type {
  OrdensProducaoListResponse,
  OrdemProducaoPainelItem,
} from '@/domain/types/ordens-producao-painel';
import type { OrdemProducaoRecord } from '@/domain/types/ordem-producao';
import { ordemProducaoRepository } from '@/data/producao/OrdemProducaoRepository';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { SupabaseProductService } from '@/lib/services/products/supabase-product-service';
import { tiposEstoqueService } from '@/lib/services/tipos-estoque-service';

type AssadeiraRow = { id: string; nome: string };

export class OrdensProducaoPainelService {
  constructor(
    private readonly productService = new SupabaseProductService(),
  ) {}

  async getListForDate(date: string): Promise<OrdensProducaoListResponse> {
    const ordens = await ordemProducaoRepository.listByDataProducao(date);

    if (ordens.length === 0) {
      return {
        date,
        resumo: { totalOrdens: 0, totalLatas: 0, totalUnidades: 0 },
        ordens: [],
      };
    }

    const tipoIds = [...new Set(ordens.map((o) => o.tipoEstoqueId))];
    const produtoIds = [...new Set(ordens.map((o) => o.produtoId))];
    const assadeiraIds = [...new Set(ordens.map((o) => o.assadeiraId).filter(Boolean))];

    const [tipos, produtos, assadeiras] = await Promise.all([
      tiposEstoqueService.findByIds(tipoIds),
      this.productService.findByIds(produtoIds),
      this.loadAssadeiraNames(assadeiraIds),
    ]);

    const tipoNomeById = new Map(tipos.map((t) => [t.id, t.nome]));
    const produtoNomeById = new Map(produtos.map((p) => [p.id, p.nome]));
    const assadeiraNomeById = new Map(assadeiras.map((a) => [a.id, a.nome]));

    const items = ordens.map((ordem) =>
      this.mapOrdemToPainelItem(ordem, tipoNomeById, produtoNomeById, assadeiraNomeById),
    );

    return {
      date,
      resumo: this.buildResumo(items),
      ordens: items,
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

  private mapOrdemToPainelItem(
    ordem: OrdemProducaoRecord,
    tipoNomeById: Map<string, string>,
    produtoNomeById: Map<string, string>,
    assadeiraNomeById: Map<string, string>,
  ): OrdemProducaoPainelItem {
    const modoQuantidade = resolveModoQuantidade(ordem.assadeiraId, ordem.assadeiras);
    const unidades = ordem.quantidade.unidades;
    const caixas = ordem.quantidade.caixas;
    const assadeiraNome = ordem.assadeiraId
      ? assadeiraNomeById.get(ordem.assadeiraId)
      : undefined;

    return {
      id: ordem.id,
      ordemPlanejamento: ordem.ordemPlanejamento,
      dataProducao: ordem.dataProducao,
      dataEtiqueta: ordem.dataFabricacaoEtiqueta,
      tipoEstoque: tipoNomeById.get(ordem.tipoEstoqueId) ?? 'Desconhecido',
      produto: produtoNomeById.get(ordem.produtoId) ?? 'Desconhecido',
      observacao: ordem.observacao,
      modoQuantidade,
      assadeiras: ordem.assadeiras,
      assadeiraNome,
      unidades,
      caixas,
      quantidadeLabel: formatOrdemQuantidadeLabel({
        modo: modoQuantidade,
        assadeiras: ordem.assadeiras,
        unidades,
        caixas,
      }),
    };
  }

  private buildResumo(items: OrdemProducaoPainelItem[]) {
    return {
      totalOrdens: items.length,
      totalLatas: items.reduce((sum, item) => sum + item.assadeiras, 0),
      totalUnidades: items.reduce((sum, item) => sum + item.unidades, 0),
    };
  }
}

export const ordensProducaoPainelService = new OrdensProducaoPainelService();
