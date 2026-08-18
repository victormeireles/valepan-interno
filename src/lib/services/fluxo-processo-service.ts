import { FluxoProcessoBuilder } from '@/domain/fluxo-processo/fluxo-processo-builder';
import { FLUXO_ASSADEIRA_SEM, FLUXO_PADRAO } from '@/domain/fluxo-processo/fluxo-processo-constants';
import type {
  CargaFluxoProcessoResponse,
  FluxoApontamentoEvento,
  FluxoBuilderInput,
  FluxoOrdemFatorInput,
} from '@/domain/fluxo-processo/fluxo-processo-types';
import type { EmbalagemLoteRecord } from '@/domain/types/embalagem-lote';
import type { FermentacaoLoteRecord } from '@/domain/types/fermentacao-lote';
import type { FornoLoteRecord } from '@/domain/types/forno-lote';
import type { OrdemProducaoRecord } from '@/domain/types/ordem-producao';
import { embalagemLoteRepository } from '@/data/embalagem/EmbalagemLoteRepository';
import { ordemProducaoRepository } from '@/data/producao/OrdemProducaoRepository';
import { fermentacaoLoteRepository } from '@/data/producao-etapa/FermentacaoLoteRepository';
import { fornoLoteRepository } from '@/data/producao-etapa/FornoLoteRepository';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { SupabaseProductService } from '@/lib/services/products/supabase-product-service';
import { FluxoFilasServiceAttach } from '@/lib/services/fluxo-filas-attach';
import {
  addCalendarDaysISO,
  brazilDayEndUtcMs,
  getTodayISOInBrazilTimezone,
} from '@/lib/utils/date-utils';

type AssadeiraRow = { id: string; nome: string };

/**
 * Carrega apontamentos do dia civil BR e monta o payload VP_FLUXO.
 */
export class FluxoProcessoService {
  private readonly builder = new FluxoProcessoBuilder();
  private readonly filasAttach = new FluxoFilasServiceAttach();

  constructor(private readonly productService = new SupabaseProductService()) {}

  async getCargaCompleta(date: string): Promise<CargaFluxoProcessoResponse> {
    const startIso = brazilDayStartIso(date);
    const endIso = brazilDayStartIso(addCalendarDaysISO(date, 1));

    const [ultimaDataComDados, fermLotes, fornoLotes, embLotes, ordensDia] = await Promise.all([
      ordemProducaoRepository.findUltimaDataComPedidos(14),
      fermentacaoLoteRepository.listByProduzidoEmRange(startIso, endIso),
      fornoLoteRepository.listByProduzidoEmRange(startIso, endIso),
      embalagemLoteRepository.listByProduzidoEmRange(startIso, endIso),
      ordemProducaoRepository.listByDataProducao(date),
    ]);

    const ordemIds = collectOrdemIds(fermLotes, fornoLotes, embLotes, ordensDia);
    const ordensExtra =
      ordemIds.length > 0 ? await ordemProducaoRepository.findByIds(ordemIds) : [];
    const ordemById = new Map<string, OrdemProducaoRecord>();
    for (const o of [...ordensDia, ...ordensExtra]) ordemById.set(o.id, o);

    const produtoIds = [
      ...new Set([
        ...[...ordemById.values()].map((o) => o.produtoId),
        ...embLotes.map((l) => l.produtoId),
      ]),
    ];
    const assadeiraIds = [
      ...new Set(
        [...ordemById.values()].map((o) => o.assadeiraId).filter((id): id is string => Boolean(id)),
      ),
    ];

    const [produtos, assadeiras] = await Promise.all([
      produtoIds.length > 0 ? this.productService.findByIds(produtoIds) : [],
      this.loadAssadeiraNames(assadeiraIds),
    ]);

    const produtoNomeById = new Map(produtos.map((p) => [p.id, p.nome]));
    const assadeiraNomeById = new Map(assadeiras.map((a) => [a.id, a.nome]));

    const resolveAssadeira = (ordem: OrdemProducaoRecord | undefined): string => {
      if (!ordem?.assadeiraId) return FLUXO_ASSADEIRA_SEM;
      return assadeiraNomeById.get(ordem.assadeiraId) ?? FLUXO_ASSADEIRA_SEM;
    };

    const resolveProduto = (
      produtoId: string | undefined,
      ordem: OrdemProducaoRecord | undefined,
    ): string => {
      if (produtoId && produtoNomeById.has(produtoId)) return produtoNomeById.get(produtoId)!;
      if (ordem && produtoNomeById.has(ordem.produtoId)) return produtoNomeById.get(ordem.produtoId)!;
      return 'Desconhecido';
    };

    const ordensFator: FluxoOrdemFatorInput[] = ordensDia.map((o) => ({
      produtoNome: resolveProduto(o.produtoId, o),
      assadeiraNome: resolveAssadeira(o),
      unidades: o.quantidade.unidades,
      latas: o.assadeiras,
      caixas: o.quantidade.caixas,
    }));

    const planoUn = ordensDia.reduce((t, o) => t + o.quantidade.unidades, 0);

    const fermentacao: FluxoApontamentoEvento[] = fermLotes.map((l) => {
      const ordem = ordemById.get(l.ordemProducaoId);
      return {
        produzidoEm: l.produzidoEm,
        produtoNome: resolveProduto(ordem?.produtoId, ordem),
        assadeiraNome: resolveAssadeira(ordem),
        unidades: l.unidades,
        latas: l.assadeiras,
        dataOp: ordem?.dataProducao,
        ordemProducaoId: l.ordemProducaoId,
      };
    });

    const forno: FluxoApontamentoEvento[] = fornoLotes.map((l) => {
      const ordem = ordemById.get(l.ordemProducaoId);
      return {
        produzidoEm: l.produzidoEm,
        produtoNome: resolveProduto(ordem?.produtoId, ordem),
        assadeiraNome: resolveAssadeira(ordem),
        unidades: l.unidades,
        latas: l.assadeiras,
        dataOp: ordem?.dataProducao,
        ordemProducaoId: l.ordemProducaoId,
      };
    });

    const embalagem: FluxoApontamentoEvento[] = embLotes.map((l) => {
      const ordemId = l.pedidoEmbalagemId ?? undefined;
      const ordem = ordemId ? ordemById.get(ordemId) : undefined;
      return {
        produzidoEm: l.produzidoEm,
        produtoNome: resolveProduto(l.produtoId, ordem),
        assadeiraNome: resolveAssadeira(ordem),
        unidades: l.quantidade.unidades,
        caixas: l.quantidade.caixas,
        dataOp: l.dataPedido || ordem?.dataProducao,
      };
    });

    const input: FluxoBuilderInput = {
      dateISO: date,
      planoUn,
      ordensDia: ordensFator,
      fermentacao,
      forno,
      embalagem,
    };

    const fluxo = this.builder.build(input);
    const todayISO = getTodayISOInBrazilTimezone();
    const filasAsOfMs = date === todayISO ? Date.now() : brazilDayEndUtcMs(date);
    const filasOps = ordensDia.map((o) => ({
      id: o.id,
      ordemPlanejamento: o.ordemPlanejamento,
      produtoNome: resolveProduto(o.produtoId, o),
      assadeiraNome: resolveAssadeira(o) || FLUXO_ASSADEIRA_SEM,
      unidades: o.quantidade.unidades,
    }));
    this.filasAttach.attach(fluxo, {
      ops: filasOps,
      fermentacao,
      forno,
      embalagem,
      camaraMin: FLUXO_PADRAO.camaraMin,
      resfrioMin: FLUXO_PADRAO.resfrioMin,
      asOfMs: filasAsOfMs,
    });
    return { date, ultimaDataComDados, fluxo };
  }

  private async loadAssadeiraNames(ids: string[]): Promise<AssadeiraRow[]> {
    if (ids.length === 0) return [];
    const supabase = supabaseClientFactory.createServiceRoleClient();
    const { data, error } = await supabase.from('assadeiras').select('id, nome').in('id', ids);
    if (error) throw new Error(`Erro ao carregar assadeiras: ${error.message}`);
    return (data ?? []) as AssadeiraRow[];
  }
}

function brazilDayStartIso(dateISO: string): string {
  return `${dateISO}T00:00:00-03:00`;
}

function collectOrdemIds(
  ferm: FermentacaoLoteRecord[],
  forno: FornoLoteRecord[],
  emb: EmbalagemLoteRecord[],
  ordensDia: OrdemProducaoRecord[],
): string[] {
  const ids = new Set<string>();
  for (const o of ordensDia) ids.add(o.id);
  for (const l of ferm) ids.add(l.ordemProducaoId);
  for (const l of forno) ids.add(l.ordemProducaoId);
  for (const l of emb) {
    if (l.pedidoEmbalagemId) ids.add(l.pedidoEmbalagemId);
  }
  return [...ids];
}

export const fluxoProcessoService = new FluxoProcessoService();
