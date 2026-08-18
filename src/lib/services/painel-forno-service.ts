import { fermentacaoLoteRepository } from '@/data/producao-etapa/FermentacaoLoteRepository';
import { fornoLoteRepository } from '@/data/producao-etapa/FornoLoteRepository';
import { assadeiraResolver } from '@/domain/assadeiras/assadeira-resolver';
import { buildPainelOrdem } from '@/domain/producao-etapa/painel-ordem-builder';
import { somarAssadeirasLotes } from '@/domain/embalagem/painel-embalagem-enrichment';
import { lotesToDashboardSnapshots } from '@/domain/producao-etapa/painel-dashboard-adapter';
import { sortOrdensPorPlanejamento } from '@/domain/realizado/etapa-painel-adapter';
import type {
  CargaEtapaResponse,
  PainelEtapaResponse,
  PainelOrdemEtapa,
} from '@/domain/types/painel-etapa';
import type { FermentacaoLoteRecord } from '@/domain/types/fermentacao-lote';
import type { OrdemProducaoRecord } from '@/domain/types/ordem-producao';
import { ordemProducaoRepository } from '@/data/producao/OrdemProducaoRepository';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { SupabaseProductService } from '@/lib/services/products/supabase-product-service';
import { tiposEstoqueService } from '@/lib/services/tipos-estoque-service';
import { addCalendarDaysISO } from '@/lib/utils/date-utils';
import { brazilCivilDayRangeIso } from '@/lib/services/ritmo-lotes-dia-loader';
import { etapaPainelRecorteLoader } from '@/lib/services/etapa-painel-recorte-loader';

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

    const ordemIds = ordens.map((ordem) => ordem.id);
    const [lotesByOrdem, fermentacaoLotesByOrdem] = await Promise.all([
      fornoLoteRepository.listByOrdemProducaoIds(ordemIds),
      fermentacaoLoteRepository.listByOrdemProducaoIds(ordemIds),
    ]);
    const visivelOrdemIds = await etapaPainelRecorteLoader.visivelOrdemIds(ordens, []);
    const ordensPainel = await this.buildOrdensPainel(
      ordens,
      lotesByOrdem,
      fermentacaoLotesByOrdem,
      visivelOrdemIds,
    );

    return { date, ordens: ordensPainel };
  }

  async getCargaCompleta(date: string): Promise<CargaEtapaResponse> {
    const dateSemana = addCalendarDaysISO(date, -7);

    const [ultimaDataComDados, dateAnterior] = await Promise.all([
      ordemProducaoRepository.findUltimaDataComPedidos(7),
      ordemProducaoRepository.findDataAnteriorComPedidos(date, 14),
    ]);

    const [ordens, lotesDia, lotesSemana, lotesAnterior] = await Promise.all([
      ordemProducaoRepository.listByDataProducao(date),
      this.listLotesDoDia(date),
      this.listLotesDoDia(dateSemana),
      dateAnterior ? this.listLotesDoDia(dateAnterior) : Promise.resolve([]),
    ]);

    const allOrdemIds = ordens.map((ordem) => ordem.id);
    const [lotesByOrdem, fermentacaoLotesByOrdem] =
      ordens.length > 0
        ? await Promise.all([
            fornoLoteRepository.listByOrdemProducaoIds(allOrdemIds),
            fermentacaoLoteRepository.listByOrdemProducaoIds(allOrdemIds),
          ])
        : [
            new Map<string, FermentacaoLoteRecord[]>(),
            new Map<string, FermentacaoLoteRecord[]>(),
          ];

    const visivelOrdemIds = await etapaPainelRecorteLoader.visivelOrdemIds(ordens, [
      ...lotesDia,
      ...lotesSemana,
      ...lotesAnterior,
    ]);
    const ordensMain = await this.buildOrdensPainel(
      ordens,
      lotesByOrdem,
      fermentacaoLotesByOrdem,
      visivelOrdemIds,
    );

    return {
      date,
      ultimaDataComDados,
      ordens: ordensMain,
      dashboardDia: lotesToDashboardSnapshots(
        lotesDia.filter((lote) => visivelOrdemIds.has(lote.ordemProducaoId)),
      ),
      comparacaoSemana: {
        date: dateSemana,
        items: lotesToDashboardSnapshots(
          lotesSemana.filter((lote) => visivelOrdemIds.has(lote.ordemProducaoId)),
        ),
      },
      comparacaoAnterior: {
        date: dateAnterior,
        items: lotesToDashboardSnapshots(
          lotesAnterior.filter((lote) => visivelOrdemIds.has(lote.ordemProducaoId)),
        ),
      },
    };
  }

  private listLotesDoDia(dateISO: string) {
    const { startIso, endIso } = brazilCivilDayRangeIso(dateISO);
    return fornoLoteRepository.listByProduzidoEmRange(startIso, endIso);
  }

  private async buildOrdensPainel(
    ordens: OrdemProducaoRecord[],
    lotesByOrdem: Map<string, FermentacaoLoteRecord[]>,
    fermentacaoLotesByOrdem: Map<string, FermentacaoLoteRecord[]>,
    visivelOrdemIds: Set<string>,
  ): Promise<PainelOrdemEtapa[]> {
    if (ordens.length === 0) return [];

    const names = await this.loadNameMaps(ordens);
    const opcoesByProdutoId = await assadeiraResolver.countOpcoesByProdutoIds(
      ordens.map((ordem) => ordem.produtoId),
    );

    return sortOrdensPorPlanejamento(
      ordens.map((ordem) =>
        buildPainelOrdem({
          etapa: 'forno',
          ordem,
          lotes: lotesByOrdem.get(ordem.id) ?? [],
          produto: names.produtoNomeById.get(ordem.produtoId) ?? 'Desconhecido',
          tipoEstoque: names.tipoNomeById.get(ordem.tipoEstoqueId) ?? 'Desconhecido',
          assadeiraNome: ordem.assadeiraId
            ? names.assadeiraNomeById.get(ordem.assadeiraId)
            : undefined,
          temMultiplasAssadeirasCadastradas:
            (opcoesByProdutoId.get(ordem.produtoId) ?? 0) > 1,
          incluirNosTotais: visivelOrdemIds.has(ordem.id),
          fermentacaoProduzido: somarAssadeirasLotes(
            fermentacaoLotesByOrdem.get(ordem.id) ?? [],
          ),
        }),
      ),
    );
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
