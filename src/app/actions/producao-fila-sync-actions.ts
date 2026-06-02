'use server';

import { revalidatePath } from 'next/cache';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type { Json } from '@/types/database';
import type {
  EmbalagemQualityData,
  FornoQualityData,
  SaidaFornoQualityData,
} from '@/domain/types/producao-etapas';
import { findReceitaMassaAtivaParaProduto } from '@/lib/production/produto-receita-massa';
import {
  chainParaEtapa,
  etapaAnteriorParaCarrinhos,
  type EtapaFilaSyncPreRequisitos,
} from '@/lib/production/producao-fila-sync-chain';
import { PRODUCAO_FILA_SYNC_FLAG } from '@/lib/production/registro-adiantado-fila';
import {
  LATAS_POR_CARRINHO_ADIANTADO,
  planejarCarrinhosAdiantados,
} from '@/lib/production/adiantar-carrinhos-split';
import {
  etapasPreenchidasPorOrigem,
  indicePipeline,
  type OrigemAdiantamento,
} from '@/lib/production/adiantar-origens';
import { resolveOrdemProducaoOperacionalId } from '@/lib/production/ordem-producao-op-sync';
import { ensurePublicOrdemForEtapasLogFk } from '@/lib/production/ensure-public-ordem-for-etapas-fk';

type ServiceClient = ReturnType<typeof supabaseClientFactory.createServiceRoleClient>;

/** Um adiantamento a partir de uma etapa-fonte específica. */
export type AdiantamentoOrigemInput = {
  origem: OrigemAdiantamento;
  /** Latas (LT) paradas nesta origem a adiantar — quebradas em carrinhos de 20. */
  latas: number;
  /** Números reais dos carrinhos desta origem (opcional; vazio → «Adiantado N»). */
  carrinhosNumeros?: Array<string | null | undefined>;
};

/** Volumes editáveis no modal antes de gravar os carrinhos «fake» de pré-requisito. */
export type SincronizarPreRequisitosOverrides = {
  /**
   * Adiantamentos por origem (volume parado em cada etapa). Quando informado, substitui
   * `totalLatasAdiantar` (que continua aceito como atalho de origem «inicio»).
   */
  adiantamentos?: AdiantamentoOrigemInput[];
  /** Total de latas (LT) já produzidas a adiantar — quebrado em carrinhos de 20 (origem «inicio»). */
  totalLatasAdiantar?: number;
  /** Números reais dos carrinhos (opcional; vazio → «Adiantado N»). */
  carrinhosNumeros?: Array<string | null | undefined>;
  /** Receitas de massa a registar quando o passo «massa» for criado (mín. 1). */
  receitasBatidasMassa?: number;
  /**
   * Meta total de receitas de massa da ordem. Quando informada (fluxo «adiantar» com carrinhos),
   * a massa é completada sinteticamente até esta meta — corrige barra parcial (ex.: 1 de 2).
   */
  receitasMassaMeta?: number;
  /** Nota do operador (auditoria, máx. 240 caracteres). */
  observacoesOperador?: string;
};

const OVERRIDE_MIN = 1;
const OVERRIDE_MAX = 500;
const TOTAL_MAX = LATAS_POR_CARRINHO_ADIANTADO * 50;

function clampOverrideInt(value: number | undefined, fallback: number): number {
  const v = value == null ? fallback : Math.round(Number(value));
  if (!Number.isFinite(v)) return fallback;
  return Math.min(OVERRIDE_MAX, Math.max(OVERRIDE_MIN, v));
}

function clampTotal(value: number | undefined): number {
  const v = Math.round(Number(value ?? 0));
  if (!Number.isFinite(v)) return LATAS_POR_CARRINHO_ADIANTADO;
  return Math.min(TOTAL_MAX, Math.max(OVERRIDE_MIN, v));
}

/** Meta de receitas (aceita frações de 0,5; 0 = não informada). */
function clampMetaReceitas(value: number | undefined): number {
  const v = Number(value ?? 0);
  if (!Number.isFinite(v) || v <= 0) return 0;
  return Math.min(OVERRIDE_MAX, v);
}

/** Latas de um adiantamento (0 = ignorar; acima do teto é truncado). */
function clampLatasChunk(value: number | undefined): number {
  const v = Math.round(Number(value ?? 0));
  if (!Number.isFinite(v) || v <= 0) return 0;
  return Math.min(TOTAL_MAX, v);
}

function obsTrimmed(s: string | undefined): string {
  const t = String(s ?? '').trim();
  return t.length > 240 ? t.slice(0, 240) : t;
}

function nowIso(): string {
  return new Date().toISOString();
}

function motivoComObs(base: string, obsOp: string): string {
  return obsOp ? `${base} — ${obsOp}` : base;
}

async function ordemTemMassaComReceita(supabase: ServiceClient, ordemId: string): Promise<boolean> {
  const { data } = await supabase
    .from('producao_etapas_log')
    .select('receita_id, receitas_batidas')
    .eq('ordem_producao_id', ordemId)
    .eq('etapa', 'massa');
  for (const row of data ?? []) {
    const r = row as { receita_id?: string | null; receitas_batidas?: number | null };
    if (r.receita_id != null && String(r.receita_id).trim() !== '') {
      const n = Number(r.receitas_batidas) || 0;
      if (n > 0) return true;
    }
  }
  return false;
}

async function ensureMassaSintetica(
  supabase: ServiceClient,
  ordemId: string,
  receitaMassaId: string,
  receitasMassa: number,
  obsOp: string,
): Promise<boolean> {
  if (await ordemTemMassaComReceita(supabase, ordemId)) return false;
  const { error } = await supabase.from('producao_etapas_log').insert({
    ordem_producao_id: ordemId,
    etapa: 'massa',
    qtd_saida: 0,
    perda_qtd: 0,
    receita_id: receitaMassaId,
    receitas_batidas: receitasMassa,
    inicio: nowIso(),
    fim: nowIso(),
    dados_qualidade: {
      [PRODUCAO_FILA_SYNC_FLAG]: true,
      motivo: motivoComObs('Sincronização pré-requisitos (massa)', obsOp),
    } as unknown as Json,
    fotos: [],
  } as never);
  if (error) throw new Error(error.message);
  return true;
}

function isLogSintetico(dadosQualidade: unknown): boolean {
  return (
    !!dadosQualidade &&
    typeof dadosQualidade === 'object' &&
    (dadosQualidade as Record<string, unknown>)[PRODUCAO_FILA_SYNC_FLAG] === true
  );
}

/**
 * Completa a massa até `metaReceitas` (soma de receitas de todos os lotes), criando ou ajustando
 * um único lote sintético com a diferença. Idempotente: reexecutar não duplica.
 * Devolve true quando houve alteração.
 */
async function completarMassaAteMeta(
  supabase: ServiceClient,
  ordemId: string,
  receitaMassaId: string,
  metaReceitas: number,
  obsOp: string,
): Promise<boolean> {
  if (!(metaReceitas > 0)) return false;

  const { data } = await supabase
    .from('producao_etapas_log')
    .select('id, receita_id, receitas_batidas, dados_qualidade')
    .eq('ordem_producao_id', ordemId)
    .eq('etapa', 'massa');

  let totalReais = 0;
  let sintetica: { id: string; valor: number } | null = null;
  for (const row of data ?? []) {
    const r = row as unknown as {
      id: string;
      receita_id?: string | null;
      receitas_batidas?: number | null;
      dados_qualidade?: unknown;
    };
    const n = Number(r.receitas_batidas) || 0;
    if (isLogSintetico(r.dados_qualidade)) {
      // Considera só o primeiro lote sintético; eventuais extras somam como "reais" (não esperado).
      if (sintetica == null) sintetica = { id: String(r.id), valor: n };
      else totalReais += n;
      continue;
    }
    const temReceita = r.receita_id != null && String(r.receita_id).trim() !== '';
    if (temReceita) totalReais += n;
  }

  const desejadoSintetico = Math.max(0, metaReceitas - totalReais);

  if (sintetica) {
    if (Math.abs(sintetica.valor - desejadoSintetico) < 1e-9) return false;
    if (desejadoSintetico <= 1e-9) {
      const { error } = await supabase
        .from('producao_etapas_log')
        .delete()
        .eq('id', sintetica.id);
      if (error) throw new Error(error.message);
      return true;
    }
    const { error } = await supabase
      .from('producao_etapas_log')
      .update({ receitas_batidas: desejadoSintetico } as never)
      .eq('id', sintetica.id);
    if (error) throw new Error(error.message);
    return true;
  }

  if (desejadoSintetico <= 1e-9) return false; // massa real já cobre a meta

  const { error } = await supabase.from('producao_etapas_log').insert({
    ordem_producao_id: ordemId,
    etapa: 'massa',
    qtd_saida: 0,
    perda_qtd: 0,
    receita_id: receitaMassaId,
    receitas_batidas: desejadoSintetico,
    inicio: nowIso(),
    fim: nowIso(),
    dados_qualidade: {
      [PRODUCAO_FILA_SYNC_FLAG]: true,
      motivo: motivoComObs('Sincronização pré-requisitos (massa)', obsOp),
    } as unknown as Json,
    fotos: [],
  } as never);
  if (error) throw new Error(error.message);
  return true;
}

/** Cria um lote de fermentação sintético com carrinho e devolve o id do log. */
async function criarFermentacaoCarrinho(
  supabase: ServiceClient,
  ordemId: string,
  args: { latas: number; qpp: number; carrinho: string; obsOp: string },
): Promise<string> {
  const { data, error } = await supabase
    .from('producao_etapas_log')
    .insert({
      ordem_producao_id: ordemId,
      etapa: 'fermentacao',
      qtd_saida: args.latas * args.qpp,
      perda_qtd: 0,
      inicio: nowIso(),
      fim: nowIso(),
      dados_qualidade: {
        [PRODUCAO_FILA_SYNC_FLAG]: true,
        motivo: motivoComObs('Sincronização pré-requisitos (fermentação)', args.obsOp),
        numero_carrinho: args.carrinho,
        assadeiras_lt: args.latas,
      } as unknown as Json,
      fotos: [],
    } as never)
    .select('id')
    .single();
  if (error || !data?.id) {
    throw new Error(error?.message ?? 'Não foi possível criar fermentação sintética.');
  }
  return String(data.id);
}

async function criarEntradaFornoCarrinho(
  supabase: ServiceClient,
  ordemId: string,
  args: { fermentacaoLogId?: string | null; latas: number; ua: number | null; obsOp: string },
): Promise<void> {
  const dq: FornoQualityData = {
    assadeiras_lt: args.latas,
    observacoes: motivoComObs(PRODUCAO_FILA_SYNC_FLAG, args.obsOp),
  };
  // Quando adiantamos a partir da própria fermentação (sem criar lote sintético), não há link.
  if (args.fermentacaoLogId) dq.fermentacao_log_id = args.fermentacaoLogId;
  const { error } = await supabase.from('producao_etapas_log').insert({
    ordem_producao_id: ordemId,
    etapa: 'entrada_forno',
    qtd_saida: args.ua != null ? args.latas * args.ua : args.latas,
    perda_qtd: 0,
    inicio: nowIso(),
    fim: nowIso(),
    dados_qualidade: dq as unknown as Json,
    fotos: [],
  } as never);
  if (error) throw new Error(error.message);
}

async function criarSaidaFornoCarrinho(
  supabase: ServiceClient,
  ordemId: string,
  args: { latas: number; carrinho: string; obsOp: string },
): Promise<string> {
  const dq: SaidaFornoQualityData = {
    numero_carrinho: args.carrinho,
    bandejas: args.latas,
    observacoes: motivoComObs(PRODUCAO_FILA_SYNC_FLAG, args.obsOp),
  };
  const { data, error } = await supabase
    .from('producao_etapas_log')
    .insert({
      ordem_producao_id: ordemId,
      etapa: 'saida_forno',
      qtd_saida: 0,
      perda_qtd: 0,
      inicio: nowIso(),
      fim: nowIso(),
      dados_qualidade: dq as unknown as Json,
      fotos: [],
    } as never)
    .select('id')
    .single();
  if (error || !data?.id) {
    throw new Error(error?.message ?? 'Não foi possível criar saída do forno sintética.');
  }
  return String(data.id);
}

async function criarEntradaEmbalagemCarrinho(
  supabase: ServiceClient,
  ordemId: string,
  args: { latas: number; carrinho: string; saidaFornoLogId?: string | null; obsOp: string },
): Promise<void> {
  const dq: EmbalagemQualityData = {
    numero_carrinho: args.carrinho,
    assadeiras: args.latas,
    observacoes: motivoComObs(PRODUCAO_FILA_SYNC_FLAG, args.obsOp),
  };
  // Sem link quando adiantamos a partir da própria saída do forno (volume real já registrado lá).
  if (args.saidaFornoLogId) dq.saida_forno_log_id = args.saidaFornoLogId;
  const { error } = await supabase.from('producao_etapas_log').insert({
    ordem_producao_id: ordemId,
    etapa: 'entrada_embalagem',
    qtd_saida: args.latas,
    perda_qtd: 0,
    inicio: nowIso(),
    fim: nowIso(),
    dados_qualidade: dq as unknown as Json,
    fotos: [],
  } as never);
  if (error) throw new Error(error.message);
}

/**
 * Cria a cadeia de carrinhos sintéticos de UM pedaço (≤ 20 LT) a partir de `origem` até a etapa-fonte
 * de carrinhos, preenchendo só as etapas posteriores à origem. Sem links quando a etapa-fonte do link
 * não foi criada (volume real já está naquela etapa).
 */
async function criarCadeiaChunk(
  supabase: ServiceClient,
  ordemId: string,
  args: {
    origem: OrigemAdiantamento;
    etapaFila: EtapaFilaSyncPreRequisitos;
    latas: number;
    carrinho: string;
    qpp: number;
    ua: number | null;
    obsOp: string;
  },
): Promise<void> {
  const etapas = new Set<string>(etapasPreenchidasPorOrigem(args.origem, args.etapaFila));

  let fermLogId: string | null = null;
  if (etapas.has('fermentacao')) {
    fermLogId = await criarFermentacaoCarrinho(supabase, ordemId, {
      latas: args.latas,
      qpp: args.qpp,
      carrinho: args.carrinho,
      obsOp: args.obsOp,
    });
  }
  if (etapas.has('entrada_forno')) {
    await criarEntradaFornoCarrinho(supabase, ordemId, {
      fermentacaoLogId: fermLogId,
      latas: args.latas,
      ua: args.ua,
      obsOp: args.obsOp,
    });
  }
  let saidaLogId: string | null = null;
  if (etapas.has('saida_forno')) {
    saidaLogId = await criarSaidaFornoCarrinho(supabase, ordemId, {
      latas: args.latas,
      carrinho: args.carrinho,
      obsOp: args.obsOp,
    });
  }
  if (etapas.has('entrada_embalagem')) {
    await criarEntradaEmbalagemCarrinho(supabase, ordemId, {
      latas: args.latas,
      carrinho: args.carrinho,
      saidaFornoLogId: saidaLogId,
      obsOp: args.obsOp,
    });
  }
}

/**
 * Cria carrinhos «fake» nas etapas anteriores à etapa da fila, a partir de uma ou mais ORIGENS
 * (etapas onde o volume está parado). Cada origem preenche só as etapas posteriores a ela, até a
 * etapa-fonte de carrinhos. NÃO cria registo na etapa atual.
 */
export async function sincronizarPreRequisitosOrdemParaEtapaFila(input: {
  ordemId: string;
  etapaFila: EtapaFilaSyncPreRequisitos;
  overrides?: SincronizarPreRequisitosOverrides;
}): Promise<{ success: true; etapasAjustadas: string[] } | { success: false; error: string }> {
  const rawOrdemId = String(input.ordemId ?? '').trim();
  if (!rawOrdemId) {
    return { success: false, error: 'Ordem inválida.' };
  }

  const chain = chainParaEtapa(input.etapaFila);
  if (chain.length === 0) {
    return { success: false, error: 'Esta etapa não permite este ajuste.' };
  }

  const ov = input.overrides;
  const receitasMassa = clampOverrideInt(ov?.receitasBatidasMassa, 1);
  const metaMassa = clampMetaReceitas(ov?.receitasMassaMeta);
  const total = clampTotal(ov?.totalLatasAdiantar);
  const obsOp = obsTrimmed(ov?.observacoesOperador);

  const supabase = supabaseClientFactory.createServiceRoleClient();

  // Resolve o UUID operacional de `ordens_producao` (mesmo id usado pelos seletores das etapas e pelo
  // ProductionStepRepository) para que os carrinhos «fake» sejam gravados onde serão lidos.
  const resolved = await resolveOrdemProducaoOperacionalId(supabase, rawOrdemId);
  if ('error' in resolved) {
    return { success: false, error: resolved.error };
  }
  const ordemId = resolved.opId;

  // Garante o espelho em `public.ordens_producao` para a FK legada de `producao_etapas_log`
  // (idempotente: só insere quando existe em interno e ainda falta em public).
  const publicSupabase = supabaseClientFactory.createServiceRolePublicClient();
  await ensurePublicOrdemForEtapasLogFk(supabase, publicSupabase, ordemId);

  const { data: ordem, error: oErr } = await supabase
    .from('ordens_producao')
    .select('id, produto_id, status')
    .eq('id', ordemId)
    .maybeSingle();

  if (oErr || !ordem) {
    return { success: false, error: 'Ordem de produção não encontrada.' };
  }

  const st = String((ordem as { status?: string | null }).status ?? '').toLowerCase();
  if (st === 'concluido' || st === 'cancelado') {
    return { success: false, error: 'Não é possível ajustar ordem concluída ou cancelada.' };
  }

  const produtoId = String((ordem as { produto_id?: string }).produto_id ?? '').trim();
  if (!produtoId) {
    return { success: false, error: 'Ordem sem produto.' };
  }

  const { data: prodRow } = await supabase
    .from('produtos')
    .select('unidades_assadeira')
    .eq('id', produtoId)
    .maybeSingle();
  const uaRaw = (prodRow as { unidades_assadeira?: number | null } | null)?.unidades_assadeira;
  const ua =
    uaRaw != null && Number.isFinite(Number(uaRaw)) && Number(uaRaw) > 0 ? Math.round(Number(uaRaw)) : null;

  const receitaMassa = await findReceitaMassaAtivaParaProduto(supabase, produtoId);
  if (!receitaMassa) {
    return {
      success: false,
      error:
        'Este produto não tem receita de massa ativa no cadastro (Produtos → receitas, tipo massa, vínculo ativo). Configure e tente de novo.',
    };
  }

  const { quantidade_por_produto: qpp, receita_id: receitaMassaId } = receitaMassa;
  const etapasAjustadas: string[] = [];
  const cartStage = etapaAnteriorParaCarrinhos(input.etapaFila);

  try {
    if (cartStage == null) {
      // etapaFila === 'fermentacao': só a massa é pré-requisito; os carrinhos são cadastrados manualmente.
      if (await ensureMassaSintetica(supabase, ordemId, receitaMassaId, receitasMassa, obsOp)) {
        etapasAjustadas.push('massa');
      }
      if (etapasAjustadas.length === 0) {
        return {
          success: false,
          error: 'A massa já estava registada. Cadastre os carrinhos de fermentação manualmente.',
        };
      }
      revalidatePath('/producao/fila');
      revalidatePath(`/producao/etapas/${ordemId}`);
      return { success: true, etapasAjustadas };
    }

    // Normaliza os adiantamentos por origem. `totalLatasAdiantar` é aceito como atalho de origem «inicio».
    const cartIdx = indicePipeline(cartStage);
    const adiantamentosRaw: AdiantamentoOrigemInput[] =
      ov?.adiantamentos && ov.adiantamentos.length > 0
        ? ov.adiantamentos
        : ov?.totalLatasAdiantar
          ? [{ origem: 'inicio', latas: total, carrinhosNumeros: ov?.carrinhosNumeros }]
          : [];
    const adiantamentos = adiantamentosRaw
      .map((a) => ({
        origem: a.origem,
        latas: clampLatasChunk(a.latas),
        carrinhosNumeros: a.carrinhosNumeros,
      }))
      // Origem precisa estar ANTES da etapa-fonte de carrinhos para haver algo a preencher.
      .filter((a) => a.latas > 0 && indicePipeline(a.origem) < cartIdx);

    if (adiantamentos.length === 0) {
      return { success: false, error: 'Informe de qual etapa e quantas latas adiantar (mínimo 1).' };
    }

    // Massa: só completa quando há volume novo entrando pela origem «inicio» (decisão de produto).
    const temInicio = adiantamentos.some((a) => a.origem === 'inicio');
    if (temInicio) {
      const ajustouMassa =
        metaMassa > 0
          ? await completarMassaAteMeta(supabase, ordemId, receitaMassaId, metaMassa, obsOp)
          : await ensureMassaSintetica(supabase, ordemId, receitaMassaId, receitasMassa, obsOp);
      if (ajustouMassa) etapasAjustadas.push('massa');
    }

    // Cada origem preenche só as etapas posteriores a ela, quebrando o volume em carrinhos de ≤ 20 LT.
    const etapasComLog = new Set<string>();
    for (const a of adiantamentos) {
      const plano = planejarCarrinhosAdiantados(a.latas, a.carrinhosNumeros);
      for (const c of plano) {
        await criarCadeiaChunk(supabase, ordemId, {
          origem: a.origem,
          etapaFila: input.etapaFila,
          latas: c.latas,
          carrinho: c.numero,
          qpp,
          ua,
          obsOp,
        });
      }
      for (const e of etapasPreenchidasPorOrigem(a.origem, input.etapaFila)) {
        etapasComLog.add(e);
      }
    }

    for (const e of ['fermentacao', 'entrada_forno', 'saida_forno', 'entrada_embalagem'] as const) {
      if (etapasComLog.has(e)) etapasAjustadas.push(e);
    }

    if (etapasAjustadas.length === 0) {
      return {
        success: false,
        error: 'Nada foi gravado. Tente de novo ou registe manualmente no card.',
      };
    }

    revalidatePath('/producao/fila');
    revalidatePath(`/producao/etapas/${ordemId}`);
    revalidatePath('/carrinhos');

    return { success: true, etapasAjustadas };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg || 'Erro ao sincronizar pré-requisitos.' };
  }
}
