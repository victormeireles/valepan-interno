'use server';

import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { isVinculoReceitaMassaAtiva } from '@/lib/utils/receita-massa-eligibility';
import {
  listReceitasMassaForProduto,
  resolveReceitaMassaForProduto,
} from '@/lib/utils/receita-massa-resolve';
import { revalidatePath } from 'next/cache';
import { ProductionStepRepository } from '@/data/production/ProductionStepRepository';
import { ProductionOrderRepository } from '@/data/production/ProductionOrderRepository';
import { ProductionStepLogManager } from '@/domain/production/ProductionStepLogManager';
import { ProductionProgressCalculator } from '@/domain/production/ProductionProgressCalculator';
import { sumReceitasBatidasFromMassaLogs } from '@/lib/utils/sum-receitas-massa-logs';
import {
  CreateProductionStepLogInput,
  UpdateProductionStepLogInput,
  ProductionStep,
  ProductionStepLog,
  MassaQualityData,
  FermentacaoQualityData,
  FornoQualityData,
  SaidaFornoQualityData,
  EmbalagemQualityData,
  SaidaEmbalagemQualityData,
  QualityData,
} from '@/domain/types/producao-etapas';
import { getTodayISOInBrazilTimezone } from '@/lib/utils/date-utils';
import { formatReceitasBatidasDisplay } from '@/lib/utils/number-utils';
import { etapaPathForOrdem } from '@/lib/production/production-station-routes';
import { resolveOrdemProducaoOperacionalId } from '@/lib/production/ordem-producao-op-sync';
import { latasRegistradasNaFermentacao } from '@/lib/utils/forno-carrinhos-disponiveis';
import { ltFromFornoLogRow, sumLatasFromFornoLogRows } from '@/lib/utils/forno-volume';
import { validateCompleteProductionStepQuality } from '@/lib/production/production-step-complete-validation';
import {
  assertCarrinhoFermentacaoUnicoNaOrdem,
  normalizeNumeroCarrinhoFermentacao,
} from '@/lib/production/fermentacao-carrinho-uniqueness';
import { assertNovaEntradaFornoSemDuplicata } from '@/lib/production/entrada-forno-start-validation';
import { FERMENTACAO_ASSADEIRAS_MAX } from '@/lib/production/fermentacao-iniciar-e-finalizar';
import {
  planejadoUnidadesConsumoFromOp,
  unidadesPorLataResolvidaParaOp,
} from '@/lib/production/ordem-producao-conversions';
import type { ProductConversionInfo } from '@/lib/utils/production-conversions';
import {
  latasSaidaFornoDoLog,
  sumLatasEntradaEmbalagemPorSaidaFornoLogId,
} from '@/lib/utils/entrada-embalagem-saida';
import {
  camposRotuloRegistroFila,
  isRegistroAdiantadoFilaComCarrinho,
  rotuloExibicaoRegistroFila,
} from '@/lib/production/registro-adiantado-fila';

async function assertCarrinhoDisponivelParaFermentacao(input: {
  supabase: ReturnType<typeof supabaseClientFactory.createServiceRoleClient>;
  numeroNormalizado: string;
  numeroParaExibir: string;
  excludeLogId?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const numeroInt = Number.parseInt(input.numeroParaExibir, 10);
  if (!Number.isFinite(numeroInt) || numeroInt <= 0) {
    return { ok: false, error: 'Número de carrinho inválido.' };
  }

  const { data: carrinhoData, error: carrinhoErr } = await input.supabase
    .from('carrinhos')
    .select('id, numero')
    .eq('numero', numeroInt)
    .maybeSingle();
  if (carrinhoErr) {
    return { ok: false, error: carrinhoErr.message };
  }
  if (!carrinhoData) {
    return {
      ok: false,
      error: `O carrinho "${input.numeroParaExibir}" não existe no cadastro de carrinhos.`,
    };
  }

  const { data: fermAtivos, error: fermErr } = await input.supabase
    .from('producao_etapas_log')
    .select('id, dados_qualidade')
    .eq('etapa', 'fermentacao')
    .is('fim', null);
  if (fermErr) {
    return { ok: false, error: fermErr.message };
  }
  for (const row of (fermAtivos ?? []) as { id: string; dados_qualidade: unknown }[]) {
    if (input.excludeLogId && row.id === input.excludeLogId) continue;
    const n = normalizeNumeroCarrinhoFermentacao(
      (row.dados_qualidade as FermentacaoQualityData | null)?.numero_carrinho,
    );
    if (n && n === input.numeroNormalizado) {
      return {
        ok: false,
        error: `O carrinho "${input.numeroParaExibir}" já está em uso na fermentação.`,
      };
    }
  }

  const { data: fornoEmbLogs, error: fornoEmbErr } = await input.supabase
    .from('producao_etapas_log')
    .select('id, ordem_producao_id, etapa, fim, dados_qualidade')
    .in('etapa', ['saida_forno', 'entrada_embalagem']);
  if (fornoEmbErr) {
    return { ok: false, error: fornoEmbErr.message };
  }

  const logs = (fornoEmbLogs ?? []) as Array<{
    id: string;
    ordem_producao_id: string;
    etapa: string;
    fim: string | null;
    dados_qualidade: unknown;
  }>;

  const entradaByOrdem = new Map<string, Array<{ dados_qualidade: unknown }>>();
  for (const row of logs) {
    if (row.etapa !== 'entrada_embalagem') continue;
    const arr = entradaByOrdem.get(row.ordem_producao_id) ?? [];
    arr.push({ dados_qualidade: row.dados_qualidade });
    entradaByOrdem.set(row.ordem_producao_id, arr);
  }

  for (const row of logs) {
    if (row.etapa !== 'saida_forno' || row.fim == null) continue;
    const dqSaida = row.dados_qualidade as SaidaFornoQualityData | null;
    if (dqSaida?.liberacao_carrinho_perda_total === true) continue;
    const n = normalizeNumeroCarrinhoFermentacao(dqSaida?.numero_carrinho);
    if (!n || n !== input.numeroNormalizado) continue;
    const latasSaida = latasSaidaFornoDoLog(dqSaida);
    const ordemLogs = [
      row as unknown as ProductionStepLog,
      ...((entradaByOrdem.get(row.ordem_producao_id) ?? []) as unknown as ProductionStepLog[]),
    ];
    const consumido = sumLatasEntradaEmbalagemPorSaidaFornoLogId(ordemLogs, row.id);
    const disponivel = latasSaida - consumido;
    if (disponivel > 0) {
      return {
        ok: false,
        error: `O carrinho "${input.numeroParaExibir}" ainda está em uso na saída do forno.`,
      };
    }
  }

  return { ok: true };
}

/** Valida carrinho livre para registrar saída do forno (qualquer carrinho do cadastro, exceto em uso). */
async function assertCarrinhoDisponivelParaSaidaForno(input: {
  supabase: ReturnType<typeof supabaseClientFactory.createServiceRoleClient>;
  numeroNormalizado: string;
  numeroParaExibir: string;
  excludeSaidaFornoLogId?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const base = await assertCarrinhoDisponivelParaFermentacao({
    supabase: input.supabase,
    numeroNormalizado: input.numeroNormalizado,
    numeroParaExibir: input.numeroParaExibir,
  });
  if (!base.ok) return base;

  const { data: entradaAberta, error: entradaErr } = await input.supabase
    .from('producao_etapas_log')
    .select('dados_qualidade')
    .eq('etapa', 'entrada_forno')
    .is('fim', null);
  if (entradaErr) {
    return { ok: false, error: entradaErr.message };
  }

  const fermIds = new Set<string>();
  for (const row of (entradaAberta ?? []) as { dados_qualidade: unknown }[]) {
    const fid = String(
      (row.dados_qualidade as FornoQualityData | null)?.fermentacao_log_id ?? '',
    ).trim();
    if (fid) fermIds.add(fid);
  }

  if (fermIds.size > 0) {
    const { data: ferms, error: fermErr } = await input.supabase
      .from('producao_etapas_log')
      .select('dados_qualidade')
      .in('id', [...fermIds]);
    if (fermErr) {
      return { ok: false, error: fermErr.message };
    }
    for (const f of (ferms ?? []) as { dados_qualidade: unknown }[]) {
      const n = normalizeNumeroCarrinhoFermentacao(
        (f.dados_qualidade as FermentacaoQualityData | null)?.numero_carrinho,
      );
      if (n && n === input.numeroNormalizado) {
        return {
          ok: false,
          error: `O carrinho "${input.numeroParaExibir}" ainda consta no forno (entrada em aberto).`,
        };
      }
    }
  }

  const { data: saidaAberta, error: saidaErr } = await input.supabase
    .from('producao_etapas_log')
    .select('id, dados_qualidade')
    .eq('etapa', 'saida_forno')
    .is('fim', null);
  if (saidaErr) {
    return { ok: false, error: saidaErr.message };
  }
  for (const row of (saidaAberta ?? []) as { id: string; dados_qualidade: unknown }[]) {
    if (input.excludeSaidaFornoLogId && row.id === input.excludeSaidaFornoLogId) continue;
    const n = normalizeNumeroCarrinhoFermentacao(
      (row.dados_qualidade as SaidaFornoQualityData | null)?.numero_carrinho,
    );
    if (n && n === input.numeroNormalizado) {
      return {
        ok: false,
        error: `O carrinho "${input.numeroParaExibir}" já tem uma saída do forno em andamento.`,
      };
    }
  }

  return { ok: true };
}

/**
 * Inicia uma nova etapa de produção
 */
export async function startProductionStep(input: {
  ordem_producao_id: string;
  etapa: ProductionStep;
  usuario_id?: string;
  qtd_saida: number;
  perda_qtd?: number;
  dados_qualidade?:
    | MassaQualityData
    | FermentacaoQualityData
    | FornoQualityData
    | SaidaFornoQualityData
    | EmbalagemQualityData
    | SaidaEmbalagemQualityData;
  fotos?: string[];
}) {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const stepRepository = new ProductionStepRepository(supabase);
  const orderRepository = new ProductionOrderRepository(supabase);
  const stepManager = new ProductionStepLogManager(stepRepository, orderRepository);

  try {
    const resolved = await resolveOrdemProducaoOperacionalId(supabase, input.ordem_producao_id);
    if ('error' in resolved) {
      return { success: false, error: resolved.error };
    }
    const opId = resolved.opId;

    if (input.etapa === 'entrada_forno') {
      const dqForno = input.dados_qualidade as FornoQualityData | undefined;
      const ordemLogs = await stepRepository.findByOrderId(opId);
      const dup = assertNovaEntradaFornoSemDuplicata(ordemLogs, dqForno?.fermentacao_log_id);
      if (!dup.ok) {
        return { success: false, error: dup.error };
      }
    }

    const createInput: CreateProductionStepLogInput = {
      ordem_producao_id: opId,
      etapa: input.etapa,
      usuario_id: input.usuario_id,
      qtd_saida: input.qtd_saida,
      perda_qtd: input.perda_qtd || 0,
      dados_qualidade: input.dados_qualidade,
      fotos: input.fotos || [],
    };

    const log = await stepManager.startStep(createInput);

    revalidatePath('/producao/fila');
    revalidatePath(`/producao/etapas/${opId}`);
    if (input.etapa === 'entrada_forno') {
      revalidatePath(`/producao/etapas/${opId}/entrada-forno`);
    }

    return { success: true, data: log };
  } catch (error) {
    console.error('Erro ao iniciar etapa:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao iniciar etapa de produção',
    };
  }
}

/**
 * Finaliza uma etapa de produção
 */
export async function completeProductionStep(input: {
  log_id: string;
  qtd_saida?: number;
  perda_qtd?: number;
  dados_qualidade?:
    | MassaQualityData
    | FermentacaoQualityData
    | FornoQualityData
    | SaidaFornoQualityData
    | EmbalagemQualityData
    | SaidaEmbalagemQualityData;
  fotos?: string[];
}) {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const stepRepository = new ProductionStepRepository(supabase);
  const orderRepository = new ProductionOrderRepository(supabase);
  const stepManager = new ProductionStepLogManager(stepRepository, orderRepository);

  try {
    const existing = await stepRepository.findById(input.log_id);
    if (!existing) {
      return { success: false, error: 'Log de etapa não encontrado.' };
    }

    const dadosParaValidar =
      input.dados_qualidade != null ? input.dados_qualidade : existing.dados_qualidade;
    const validation = validateCompleteProductionStepQuality(existing.etapa, dadosParaValidar);
    if (!validation.ok) {
      return { success: false, error: validation.error };
    }

    if (existing.etapa === 'fermentacao') {
      const fdq = dadosParaValidar as FermentacaoQualityData;
      const norm = normalizeNumeroCarrinhoFermentacao(fdq.numero_carrinho);
      const exibir =
        typeof fdq.numero_carrinho === 'string'
          ? fdq.numero_carrinho.trim()
          : String(fdq.numero_carrinho ?? '').trim();
      if (norm) {
        const disponibilidade = await assertCarrinhoDisponivelParaFermentacao({
          supabase,
          numeroNormalizado: norm,
          numeroParaExibir: exibir || norm,
          excludeLogId: input.log_id,
        });
        if (!disponibilidade.ok) return { success: false, error: disponibilidade.error };

        const ordemLogs = await stepRepository.findByOrderId(existing.ordem_producao_id);
        const dup = assertCarrinhoFermentacaoUnicoNaOrdem(
          ordemLogs,
          input.log_id,
          norm,
          exibir,
        );
        if (!dup.ok) return { success: false, error: dup.error };
      }
    }

    const updateInput: UpdateProductionStepLogInput = {
      qtd_saida: input.qtd_saida,
      perda_qtd: input.perda_qtd,
      dados_qualidade: input.dados_qualidade,
      fotos: input.fotos,
    };

    const log = await stepManager.completeStep(input.log_id, updateInput);

    revalidatePath('/producao/fila');
    revalidatePath(`/producao/etapas/${existing.ordem_producao_id}`);

    return { success: true, data: log };
  } catch (error) {
    console.error('Erro ao finalizar etapa:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao finalizar etapa de produção',
    };
  }
}

/**
 * Busca logs de uma ordem de produção
 */
export async function getProductionStepLogs(ordemProducaoId: string) {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const stepRepository = new ProductionStepRepository(supabase);

  try {
    const logs = await stepRepository.findByOrderId(ordemProducaoId);
    return { success: true, data: logs };
  } catch (error) {
    console.error('Erro ao buscar logs:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao buscar logs de produção',
    };
  }
}

/**
 * Soma latas (LT) registradas na entrada do forno com início no dia indicado (timezone Brasil).
 * Sem argumento, usa o dia corrente no Brasil.
 */
export async function getTotalLatasEntradaFornoHoje(diaReferenciaIso?: string): Promise<number> {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const day =
    typeof diaReferenciaIso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(diaReferenciaIso.trim())
      ? diaReferenciaIso.trim()
      : getTodayISOInBrazilTimezone();
  const startIso = `${day}T03:00:00.000Z`;
  const endBoundary = new Date(startIso);
  endBoundary.setUTCDate(endBoundary.getUTCDate() + 1);
  const endIso = endBoundary.toISOString();

  try {
    const { data: logs, error } = await supabase
      .from('producao_etapas_log')
      .select('ordem_producao_id, qtd_saida, dados_qualidade')
      .eq('etapa', 'entrada_forno')
      .gte('inicio', startIso)
      .lt('inicio', endIso);

    if (error) {
      console.error('getTotalLatasEntradaFornoHoje:', error);
      return 0;
    }
    if (!logs?.length) return 0;

    const orderIds = [...new Set(logs.map((l) => l.ordem_producao_id as string))];
    const { data: ordens, error: errOrdens } = await supabase
      .from('ordens_producao')
      .select('id, produto_id')
      .in('id', orderIds);

    if (errOrdens) {
      console.error('getTotalLatasEntradaFornoHoje ordens:', errOrdens);
      return 0;
    }

    const produtoIds = [
      ...new Set(
        (ordens ?? [])
          .map((o) => (o as { produto_id?: string }).produto_id)
          .filter((id): id is string => Boolean(id && String(id).trim())),
      ),
    ];
    const uaByProduto = new Map<string, number | null>();
    if (produtoIds.length > 0) {
      const { data: prows, error: perr } = await supabase
        .from('produtos')
        .select('id, unidades_assadeira')
        .in('id', produtoIds);
      if (perr) {
        console.error('getTotalLatasEntradaFornoHoje produtos:', perr);
      } else {
        for (const p of (prows ?? []) as { id: string; unidades_assadeira?: number | null }[]) {
          const ua = p.unidades_assadeira;
          const uaOk = ua != null && Number(ua) > 0 ? Number(ua) : null;
          uaByProduto.set(p.id, uaOk);
        }
      }
    }

    const uaByOrder = new Map<string, number | null>();
    for (const o of ordens ?? []) {
      const row = o as { id: string; produto_id?: string };
      const ua = row.produto_id ? uaByProduto.get(row.produto_id) ?? null : null;
      uaByOrder.set(row.id, ua);
    }

    let total = 0;
    for (const log of logs) {
      const oid = log.ordem_producao_id as string;
      const ua = uaByOrder.get(oid) ?? null;
      total += sumLatasFromFornoLogRows(
        [
          {
            qtd_saida: log.qtd_saida as number | null,
            dados_qualidade: log.dados_qualidade,
          },
        ],
        ua,
      );
    }
    return total;
  } catch (e) {
    console.error('getTotalLatasEntradaFornoHoje:', e);
    return 0;
  }
}

/**
 * Atualiza um log de etapa ainda em andamento (ex.: corrigir latas na entrada do forno).
 */
export async function updateInProgressProductionStepLog(input: {
  log_id: string;
  qtd_saida?: number;
  dados_qualidade?:
    | MassaQualityData
    | FermentacaoQualityData
    | FornoQualityData
    | SaidaFornoQualityData
    | EmbalagemQualityData
    | SaidaEmbalagemQualityData;
  fotos?: string[];
}) {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const stepRepository = new ProductionStepRepository(supabase);

  try {
    const log = await stepRepository.findById(input.log_id);
    if (!log) {
      return { success: false, error: 'Log de etapa não encontrado.' };
    }
    if (log.fim !== null) {
      return {
        success: false,
        error: 'Só é possível editar etapas em andamento. Entradas já finalizadas não podem ser alteradas aqui.',
      };
    }

    const prevDq = log.dados_qualidade;
    const patch: UpdateProductionStepLogInput = {};

    if (input.dados_qualidade != null) {
      patch.dados_qualidade = {
        ...(prevDq != null && typeof prevDq === 'object' ? prevDq : {}),
        ...input.dados_qualidade,
      } as QualityData;
    }
    if (input.qtd_saida !== undefined) patch.qtd_saida = input.qtd_saida;
    if (input.fotos !== undefined) patch.fotos = input.fotos;

    if (Object.keys(patch).length === 0) {
      return { success: false, error: 'Nenhum dado para atualizar.' };
    }

    if (log.etapa === 'fermentacao' && patch.dados_qualidade != null) {
      const dq = patch.dados_qualidade as FermentacaoQualityData;
      const norm = normalizeNumeroCarrinhoFermentacao(dq.numero_carrinho);
      const exibir =
        typeof dq.numero_carrinho === 'string'
          ? dq.numero_carrinho.trim()
          : String(dq.numero_carrinho ?? '').trim();
      if (norm) {
        const disponibilidade = await assertCarrinhoDisponivelParaFermentacao({
          supabase,
          numeroNormalizado: norm,
          numeroParaExibir: exibir || norm,
          excludeLogId: input.log_id,
        });
        if (!disponibilidade.ok) return { success: false, error: disponibilidade.error };

        const ordemLogs = await stepRepository.findByOrderId(log.ordem_producao_id);
        const dup = assertCarrinhoFermentacaoUnicoNaOrdem(
          ordemLogs,
          input.log_id,
          norm,
          exibir,
        );
        if (!dup.ok) return { success: false, error: dup.error };
      }
    }

    const updated = await stepRepository.update(input.log_id, patch);

    revalidatePath('/producao/fila');
    revalidatePath(`/producao/etapas/${log.ordem_producao_id}`);
    revalidatePath(`/producao/etapas/${log.ordem_producao_id}/entrada-forno`);

    return { success: true, data: updated };
  } catch (error) {
    console.error('Erro ao atualizar log em andamento:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar registro',
    };
  }
}

/**
 * Marca um carrinho da fermentação como perda total para não aparecer mais na entrada do forno.
 */
export async function marcarPerdaTotalCarrinhoEntradaForno(input: { fermentacao_log_id: string }) {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const stepRepository = new ProductionStepRepository(supabase);

  try {
    const log = await stepRepository.findById(input.fermentacao_log_id);
    if (!log || log.etapa !== 'fermentacao') {
      return { success: false as const, error: 'Registro de fermentação não encontrado.' };
    }

    const prev = log.dados_qualidade;
    const dadosAtualizados = {
      ...(prev != null && typeof prev === 'object' ? prev : {}),
      excluido_da_lista_forno: true,
    } as QualityData;

    await stepRepository.update(log.id, { dados_qualidade: dadosAtualizados });

    revalidatePath('/carrinhos');
    revalidatePath('/producao/fila');
    revalidatePath(`/producao/etapas/${log.ordem_producao_id}`);
    revalidatePath(`/producao/etapas/${log.ordem_producao_id}/entrada-forno`);

    return { success: true as const };
  } catch (error) {
    console.error('marcarPerdaTotalCarrinhoEntradaForno:', error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Erro ao marcar perda total do carrinho.',
    };
  }
}

const MAX_LATAS_ENTRADA_FORNO = 20;

/**
 * Corrige as latas (LT) de uma entrada no forno (aberta ou já finalizada).
 */
export async function updateEntradaFornoRegistroLog(input: {
  log_id: string;
  ordem_producao_id: string;
  assadeiras_lt: number;
  unidades_assadeira?: number | null;
}): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const stepRepository = new ProductionStepRepository(supabase);

  const latas = Math.round(Number(input.assadeiras_lt));
  if (!Number.isFinite(latas) || latas < 1 || latas > MAX_LATAS_ENTRADA_FORNO) {
    return {
      success: false,
      error: `Informe latas (LT) entre 1 e ${MAX_LATAS_ENTRADA_FORNO}.`,
    };
  }

  try {
    const log = await stepRepository.findById(input.log_id);
    if (!log || log.ordem_producao_id !== input.ordem_producao_id) {
      return { success: false, error: 'Registro não encontrado.' };
    }
    if (log.etapa !== 'entrada_forno') {
      return { success: false, error: 'Registro não é de entrada no forno.' };
    }

    const prev = log.dados_qualidade as FornoQualityData | null;
    const fermId = String(prev?.fermentacao_log_id ?? '').trim();
    if (fermId) {
      const all = await stepRepository.findByOrderId(input.ordem_producao_id);
      const ua =
        input.unidades_assadeira != null && input.unidades_assadeira > 0
          ? Number(input.unidades_assadeira)
          : null;
      const maxRef = latasRegistradasNaFermentacao(all, fermId, ua);
      if (maxRef > 0 && latas > maxRef + 1e-9) {
        return {
          success: false,
          error: `No máximo ${maxRef.toLocaleString('pt-BR')} LT (referência na fermentação).`,
        };
      }
    }

    if (log.fim == null) {
      const r = await updateInProgressProductionStepLog({
        log_id: log.id,
        dados_qualidade: {
          ...(prev != null && typeof prev === 'object' ? prev : {}),
          assadeiras_lt: latas,
        },
      });
      if (!r.success) {
        return { success: false, error: r.error ?? 'Erro ao atualizar entrada no forno.' };
      }
    } else {
      const dadosQualidade: FornoQualityData = {
        ...(prev != null && typeof prev === 'object' ? prev : {}),
        assadeiras_lt: latas,
      };
      const ua = input.unidades_assadeira;
      const patch: UpdateProductionStepLogInput = {
        dados_qualidade: dadosQualidade as QualityData,
      };
      if (ua != null && Number(ua) > 0) {
        patch.qtd_saida = latas * Number(ua);
      }
      await stepRepository.update(log.id, patch);
    }

    revalidateOrdemEtapasEstoque(input.ordem_producao_id, 'entrada_forno');
    revalidatePath('/carrinhos');
    return { success: true };
  } catch (error) {
    console.error('updateEntradaFornoRegistroLog:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar entrada no forno.',
    };
  }
}

/**
 * Remove um registro de entrada no forno (ex.: duplicado). Não altera logs de fermentação nem saída do forno.
 */
export async function deleteEntradaFornoProductionStepLog(input: {
  log_id: string;
  ordem_producao_id: string;
}) {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const stepRepository = new ProductionStepRepository(supabase);

  try {
    const log = await stepRepository.findById(input.log_id);
    if (!log) {
      return { success: false, error: 'Registro não encontrado.' };
    }
    if (log.ordem_producao_id !== input.ordem_producao_id) {
      return { success: false, error: 'Registro não pertence a esta ordem de produção.' };
    }
    if (log.etapa !== 'entrada_forno') {
      return { success: false, error: 'Só é possível excluir registros de entrada no forno.' };
    }

    await stepRepository.deleteById(input.log_id);
    await removerOrigemSinteticaOrfaAposExclusao(stepRepository, input.ordem_producao_id, log);

    revalidatePath('/producao/fila');
    revalidatePath(`/producao/etapas/${input.ordem_producao_id}`);
    revalidatePath(`/producao/etapas/${input.ordem_producao_id}/entrada-forno`);

    return { success: true };
  } catch (error) {
    console.error('Erro ao excluir entrada no forno:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao excluir registro',
    };
  }
}

function revalidateOrdemEtapasEstoque(ordemProducaoId: string, etapa?: ProductionStep) {
  revalidatePath('/producao/fila');
  revalidatePath(`/producao/etapas/${ordemProducaoId}`);
  revalidatePath('/producao/estoque');
  if (etapa) {
    revalidatePath(etapaPathForOrdem(ordemProducaoId, etapa));
  }
}

function fmtRegistroEtapaData(iso: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Linha resumida para o painel «Registros» nas etapas. */
export type StepRegistroUiItem = {
  id: string;
  inicioIso: string;
  fimIso: string | null;
  titulo: string;
  subtitulo: string | null;
  /** Preenchido só em `saida_embalagem` — permite ajuste rápido de caixas. */
  caixasEditaveis: number | null;
  /** Preenchido só em `entrada_embalagem` — latas (LT) do registro. */
  latasEditaveis: number | null;
  /** Fermentação: número do carrinho editável. */
  carrinhoEditavel: string | null;
  /** Fermentação: assadeiras (LT) editáveis. */
  assadeirasLtEditavel: number | null;
  /** Fermentação: bloqueado porque já entrou no forno. */
  bloqueadoNoForno: boolean;
  /** Fermentação: log ainda sem `fim` (fluxo legado). */
  emAndamento: boolean;
};

function fermentacaoBloqueadoPorEntradaForno(
  allLogs: ProductionStepLog[],
  fermentacaoLogId: string,
): boolean {
  return allLogs.some(
    (x) =>
      x.etapa === 'entrada_forno' &&
      String((x.dados_qualidade as FornoQualityData | null)?.fermentacao_log_id ?? '').trim() ===
        fermentacaoLogId,
  );
}

export async function listRegistrosEtapaForUi(
  ordem_producao_id: string,
  etapa: ProductionStep,
): Promise<{ success: true; data: StepRegistroUiItem[] } | { success: false; error: string }> {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const stepRepository = new ProductionStepRepository(supabase);

  try {
    if (etapa === 'massa') {
      const { getMassaLotesByOrder } = await import('./producao-massa-actions');
      const r = await getMassaLotesByOrder(ordem_producao_id);
      if (!r.success || !r.data) {
        return { success: false, error: r.error ?? 'Erro ao listar lotes de massa.' };
      }
      const data: StepRegistroUiItem[] = r.data.map((l) => ({
        id: l.id,
        inicioIso: l.created_at,
        fimIso: null,
        titulo: `${formatReceitasBatidasDisplay(l.receitas_batidas) || '0'} receitas`,
        subtitulo: fmtRegistroEtapaData(l.created_at),
        caixasEditaveis: null,
        latasEditaveis: null,
        carrinhoEditavel: null,
        assadeirasLtEditavel: null,
        bloqueadoNoForno: false,
        emAndamento: false,
      }));
      return { success: true, data };
    }

    const logs = await stepRepository.findByOrderId(ordem_producao_id);
    const filtered = logs
      .filter((l) => l.etapa === etapa)
      .sort((a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime());

    const data: StepRegistroUiItem[] = filtered.map((l) => {
      let titulo = String(etapa);
      let subtitulo: string | null = fmtRegistroEtapaData(l.inicio);
      let caixasEditaveis: number | null = null;
      let latasEditaveis: number | null = null;
      let carrinhoEditavel: string | null = null;
      let assadeirasLtEditavel: number | null = null;
      let bloqueadoNoForno = false;
      let emAndamento = false;
      const dq = l.dados_qualidade;

      if (etapa === 'fermentacao') {
        const d = dq as FermentacaoQualityData | null;
        const carrinhoRaw =
          d?.numero_carrinho != null ? String(d.numero_carrinho).trim() : '';
        const lt = d?.assadeiras_lt;
        const ltFerm =
          lt != null && Number.isFinite(Number(lt)) ? Math.round(Number(lt)) : undefined;
        titulo = rotuloExibicaoRegistroFila('fermentacao', dq, carrinhoRaw, { latas: ltFerm });
        if (ltFerm != null) {
          subtitulo = `${subtitulo} · ${ltFerm} LT`;
          assadeirasLtEditavel = ltFerm;
        }
        carrinhoEditavel = carrinhoRaw || null;
        emAndamento = l.fim == null;
        bloqueadoNoForno =
          l.fim != null && fermentacaoBloqueadoPorEntradaForno(logs, l.id);
        if (bloqueadoNoForno) {
          subtitulo = `${subtitulo ?? ''} · No forno`.replace(/^ · /, '');
        }
        if (emAndamento) {
          subtitulo = `${subtitulo ?? ''} · Em andamento`.replace(/^ · /, '');
        }
      } else if (etapa === 'entrada_forno') {
        const d = dq as FornoQualityData | null;
        const ltForno =
          d?.assadeiras_lt != null && Number.isFinite(Number(d.assadeiras_lt))
            ? Math.round(Number(d.assadeiras_lt))
            : undefined;
        titulo = rotuloExibicaoRegistroFila('entrada_forno', dq, null, { latas: ltForno });
        if (!titulo && ltForno != null) titulo = `${ltForno} LT`;
        if (!titulo) titulo = 'Entrada no forno';
      } else if (etapa === 'saida_forno') {
        const d = dq as SaidaFornoQualityData | null;
        const carSaida = d?.numero_carrinho != null ? String(d.numero_carrinho).trim() : '';
        const bandejasN =
          d?.bandejas != null && Number.isFinite(Number(d.bandejas))
            ? Math.round(Number(d.bandejas))
            : undefined;
        titulo = rotuloExibicaoRegistroFila('saida_forno', dq, carSaida, { bandejas: bandejasN });
        if (d?.bandejas != null && !String(titulo).includes('LT')) {
          subtitulo = `${subtitulo} · ${d.bandejas} bandejas`;
        }
      } else if (etapa === 'entrada_embalagem') {
        const d = dq as EmbalagemQualityData | null;
        const carEmb = d?.numero_carrinho != null ? String(d.numero_carrinho).trim() : '';
        const ltEmb = d?.assadeiras;
        let nLtEmb: number | undefined;
        if (ltEmb != null && Number.isFinite(Number(ltEmb))) {
          nLtEmb = Math.round(Number(ltEmb));
        } else if (l.qtd_saida != null && Number.isFinite(Number(l.qtd_saida))) {
          const nLt = Math.round(Number(l.qtd_saida));
          if (nLt > 0) nLtEmb = nLt;
        }
        titulo = rotuloExibicaoRegistroFila('entrada_embalagem', dq, carEmb, { latas: nLtEmb });
        if (nLtEmb != null) {
          subtitulo = `${subtitulo} · ${nLtEmb} LT`;
          latasEditaveis = nLtEmb;
        }
      } else if (etapa === 'saida_embalagem') {
        const d = dq as SaidaEmbalagemQualityData | null;
        const cr = d?.caixas_recebidas;
        if (cr != null && Number.isFinite(Number(cr))) {
          const n = Math.round(Number(cr));
          titulo = `${n} caixas`;
          caixasEditaveis = n;
        } else {
          titulo = 'Saída embalagem';
        }
        subtitulo = `${fmtRegistroEtapaData(l.inicio)}${l.fim ? ' · Concluído' : ''}`;
      }

      return {
        id: l.id,
        inicioIso: l.inicio,
        fimIso: l.fim,
        titulo,
        subtitulo,
        caixasEditaveis,
        latasEditaveis,
        carrinhoEditavel,
        assadeirasLtEditavel,
        bloqueadoNoForno,
        emAndamento,
      };
    });

    return { success: true, data };
  } catch (error) {
    console.error('listRegistrosEtapaForUi:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao listar registros.',
    };
  }
}

/**
 * Atualiza `caixas_recebidas` em um log específico de `saida_embalagem` (ajuste retroativo).
 */
export async function updateSaidaEmbalagemLogCaixas(input: {
  log_id: string;
  ordem_producao_id: string;
  caixas_recebidas: number;
}) {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const stepRepository = new ProductionStepRepository(supabase);
  const orderRepository = new ProductionOrderRepository(supabase);
  const caixas = Math.round(Number(input.caixas_recebidas));
  if (!Number.isFinite(caixas) || caixas < 0) {
    return { success: false as const, error: 'Informe um número inteiro de caixas (0 ou mais).' };
  }

  try {
    const log = await stepRepository.findById(input.log_id);
    if (!log || log.ordem_producao_id !== input.ordem_producao_id) {
      return { success: false as const, error: 'Registro não encontrado.' };
    }
    if (log.etapa !== 'saida_embalagem') {
      return { success: false as const, error: 'Só é possível ajustar caixas em registros de saída de embalagem.' };
    }
    const prev = log.dados_qualidade;
    const merged = {
      ...(prev != null && typeof prev === 'object' ? prev : {}),
      caixas_recebidas: caixas,
    } as QualityData;
    await stepRepository.update(log.id, {
      dados_qualidade: merged,
      qtd_saida: caixas,
    });
    await syncOrdemStatusAposSaidaEmbalagem(stepRepository, orderRepository, input.ordem_producao_id);
    revalidateOrdemEtapasEstoque(input.ordem_producao_id, 'saida_embalagem');
    return { success: true as const };
  } catch (error) {
    console.error('updateSaidaEmbalagemLogCaixas:', error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Erro ao atualizar caixas.',
    };
  }
}

/**
 * Corrige carrinho e assadeiras (LT) de um lote de fermentação já concluído.
 */
export async function updateFermentacaoRegistroLog(input: {
  log_id: string;
  ordem_producao_id: string;
  numero_carrinho: string;
  assadeiras_lt: number;
  unidades_assadeira?: number | null;
}): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const stepRepository = new ProductionStepRepository(supabase);

  const carrinhoTrim = input.numero_carrinho.trim();
  if (!carrinhoTrim) {
    return { success: false, error: 'Informe o número do carrinho.' };
  }

  const ass = Math.round(Number(input.assadeiras_lt));
  if (!Number.isFinite(ass) || ass < 1 || ass > FERMENTACAO_ASSADEIRAS_MAX) {
    return {
      success: false,
      error: `Informe a quantidade de assadeiras entre 1 e ${FERMENTACAO_ASSADEIRAS_MAX}.`,
    };
  }

  try {
    const log = await stepRepository.findById(input.log_id);
    if (!log || log.ordem_producao_id !== input.ordem_producao_id) {
      return { success: false, error: 'Registro não encontrado.' };
    }
    if (log.etapa !== 'fermentacao') {
      return { success: false, error: 'Registro não é da etapa fermentação.' };
    }
    if (log.fim == null) {
      return {
        success: false,
        error: 'Este lote ainda está em andamento. Finalize-o ou use o formulário principal.',
      };
    }

    const all = await stepRepository.findByOrderId(input.ordem_producao_id);
    if (fermentacaoBloqueadoPorEntradaForno(all, log.id)) {
      return {
        success: false,
        error: 'Este carrinho já entrou no forno. Exclua primeiro a entrada no forno para alterar.',
      };
    }

    const norm = normalizeNumeroCarrinhoFermentacao(carrinhoTrim);
    const disponibilidade = await assertCarrinhoDisponivelParaFermentacao({
      supabase,
      numeroNormalizado: norm,
      numeroParaExibir: carrinhoTrim,
      excludeLogId: log.id,
    });
    if (!disponibilidade.ok) {
      return { success: false, error: disponibilidade.error };
    }

    const dup = assertCarrinhoFermentacaoUnicoNaOrdem(all, log.id, norm, carrinhoTrim);
    if (!dup.ok) {
      return { success: false, error: dup.error };
    }

    const prev = log.dados_qualidade as FermentacaoQualityData | null;
    const dadosQualidade: FermentacaoQualityData = {
      ...(prev != null && typeof prev === 'object' ? prev : {}),
      numero_carrinho: carrinhoTrim,
      assadeiras_lt: ass,
    };

    const ua = input.unidades_assadeira;
    const qtdSaida =
      ua != null && Number(ua) > 0
        ? ass * Number(ua)
        : log.qtd_saida != null
          ? log.qtd_saida
          : undefined;

    await stepRepository.update(log.id, {
      dados_qualidade: dadosQualidade as QualityData,
      ...(qtdSaida != null ? { qtd_saida: qtdSaida } : {}),
    });

    revalidateOrdemEtapasEstoque(input.ordem_producao_id, 'fermentacao');
    revalidatePath('/carrinhos');
    return { success: true };
  } catch (error) {
    console.error('updateFermentacaoRegistroLog:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar fermentação.',
    };
  }
}

const MAX_BANDEJAS_SAIDA_FORNO = 20;

/**
 * Corrige carrinho e bandejas (LT) de um lançamento de saída do forno.
 */
export async function updateSaidaFornoRegistroLog(input: {
  log_id: string;
  ordem_producao_id: string;
  numero_carrinho: string;
  bandejas: number;
  unidades_assadeira?: number | null;
}): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const stepRepository = new ProductionStepRepository(supabase);

  const carrinhoTrim = input.numero_carrinho.trim();
  if (!carrinhoTrim) {
    return { success: false, error: 'Informe o número do carrinho.' };
  }

  const bandejas = Math.round(Number(input.bandejas));
  if (!Number.isFinite(bandejas) || bandejas < 1 || bandejas > MAX_BANDEJAS_SAIDA_FORNO) {
    return {
      success: false,
      error: `Informe bandejas (LT) entre 1 e ${MAX_BANDEJAS_SAIDA_FORNO}.`,
    };
  }

  try {
    const log = await stepRepository.findById(input.log_id);
    if (!log || log.ordem_producao_id !== input.ordem_producao_id) {
      return { success: false, error: 'Registro não encontrado.' };
    }
    if (log.etapa !== 'saida_forno') {
      return { success: false, error: 'Registro não é de saída do forno.' };
    }

    const all = await stepRepository.findByOrderId(input.ordem_producao_id);
    const bloqueadoEmb = all.some(
      (x) =>
        x.etapa === 'entrada_embalagem' &&
        (x.dados_qualidade as EmbalagemQualityData | null)?.saida_forno_log_id === log.id,
    );
    if (bloqueadoEmb) {
      return {
        success: false,
        error: 'Este lançamento já foi recebido na embalagem. Exclua primeiro a entrada na embalagem.',
      };
    }

    const norm = normalizeNumeroCarrinhoFermentacao(carrinhoTrim);
    const disponibilidade = await assertCarrinhoDisponivelParaSaidaForno({
      supabase,
      numeroNormalizado: norm,
      numeroParaExibir: carrinhoTrim,
      excludeSaidaFornoLogId: log.id,
    });
    if (!disponibilidade.ok) {
      return { success: false, error: disponibilidade.error };
    }

    const prev = log.dados_qualidade as SaidaFornoQualityData | null;
    const dadosQualidade: SaidaFornoQualityData = {
      ...(prev != null && typeof prev === 'object' ? prev : {}),
      numero_carrinho: carrinhoTrim,
      bandejas,
    };

    const ua = input.unidades_assadeira;
    const patch: UpdateProductionStepLogInput = {
      dados_qualidade: dadosQualidade as QualityData,
    };
    if (ua != null && Number(ua) > 0) {
      patch.qtd_saida = bandejas * Number(ua);
    }

    if (log.fim == null) {
      const r = await updateInProgressProductionStepLog({
        log_id: log.id,
        dados_qualidade: dadosQualidade,
        qtd_saida: patch.qtd_saida,
      });
      if (!r.success) {
        return { success: false, error: r.error ?? 'Erro ao atualizar saída do forno.' };
      }
    } else {
      await stepRepository.update(log.id, patch);
    }

    revalidateOrdemEtapasEstoque(input.ordem_producao_id, 'saida_forno');
    revalidatePath('/carrinhos');
    return { success: true };
  } catch (error) {
    console.error('updateSaidaFornoRegistroLog:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar saída do forno.',
    };
  }
}

/**
 * Exclui um registro de etapa (lote / lançamento), com validações de encadeamento.
 */
/**
 * Após excluir um registro «adiantado», remove o carrinho de ORIGEM sintético que ficou órfão
 * (sem outros consumidores). Sem isto, as latas adiantadas reapareceriam no seletor da etapa
 * seguinte com o saldo «restaurado» (ex.: saída do forno sintética volta a aparecer na entrada
 * da embalagem). Só remove origens sintéticas — nunca produção real.
 */
async function removerOrigemSinteticaOrfaAposExclusao(
  stepRepository: ProductionStepRepository,
  ordemId: string,
  logExcluido: ProductionStepLog,
): Promise<void> {
  // Só limpa a origem quando o próprio registro excluído é sintético (desfazer um adiantamento).
  // Excluir um lançamento REAL (ex.: corrigir e recadastrar) não deve apagar o carrinho de origem.
  const childDq = logExcluido.dados_qualidade as { numero_carrinho?: string | null } | null;
  if (!isRegistroAdiantadoFilaComCarrinho(logExcluido.dados_qualidade, childDq?.numero_carrinho)) {
    return;
  }

  let parentId = '';
  let parentEtapa: ProductionStep | null = null;
  if (logExcluido.etapa === 'entrada_embalagem') {
    parentId = String(
      (logExcluido.dados_qualidade as EmbalagemQualityData | null)?.saida_forno_log_id ?? '',
    ).trim();
    parentEtapa = 'saida_forno';
  } else if (logExcluido.etapa === 'entrada_forno') {
    parentId = String(
      (logExcluido.dados_qualidade as FornoQualityData | null)?.fermentacao_log_id ?? '',
    ).trim();
    parentEtapa = 'fermentacao';
  }
  if (!parentId || !parentEtapa) return;

  const restantes = await stepRepository.findByOrderId(ordemId);
  const parent = restantes.find((x) => x.id === parentId) ?? null;
  if (!parent || parent.etapa !== parentEtapa) return;

  const dq = parent.dados_qualidade as { numero_carrinho?: string | null } | null;
  const sintetica = isRegistroAdiantadoFilaComCarrinho(parent.dados_qualidade, dq?.numero_carrinho);
  if (!sintetica) return;

  const aindaUsada = restantes.some((x) => {
    if (x.id === logExcluido.id) return false;
    if (parentEtapa === 'saida_forno') {
      return (
        x.etapa === 'entrada_embalagem' &&
        String((x.dados_qualidade as EmbalagemQualityData | null)?.saida_forno_log_id ?? '').trim() ===
          parentId
      );
    }
    return (
      x.etapa === 'entrada_forno' &&
      String((x.dados_qualidade as FornoQualityData | null)?.fermentacao_log_id ?? '').trim() ===
        parentId
    );
  });
  if (aindaUsada) return;

  await stepRepository.deleteById(parentId);
}

export async function deleteRegistroEtapaProducao(input: {
  log_id: string;
  ordem_producao_id: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const stepRepository = new ProductionStepRepository(supabase);

  try {
    const log = await stepRepository.findById(input.log_id);
    if (!log) {
      return { success: false, error: 'Registro não encontrado.' };
    }
    if (log.ordem_producao_id !== input.ordem_producao_id) {
      return { success: false, error: 'Registro não pertence a esta ordem.' };
    }

    if (log.etapa === 'massa') {
      const { deleteMassaLote } = await import('./producao-massa-actions');
      const r = await deleteMassaLote(log.id);
      if (!r.success) {
        return { success: false, error: r.error ?? 'Erro ao excluir lote de massa.' };
      }
      revalidateOrdemEtapasEstoque(input.ordem_producao_id, 'massa');
      return { success: true };
    }

    if (log.etapa === 'entrada_forno') {
      const r = await deleteEntradaFornoProductionStepLog({
        log_id: log.id,
        ordem_producao_id: input.ordem_producao_id,
      });
      if (!r.success) {
        return { success: false, error: r.error ?? 'Erro ao excluir entrada no forno.' };
      }
      return { success: true };
    }

    const all = await stepRepository.findByOrderId(input.ordem_producao_id);

    if (log.etapa === 'fermentacao') {
      const bloqueado = all.some(
        (x) =>
          x.etapa === 'entrada_forno' &&
          (x.dados_qualidade as FornoQualityData | null)?.fermentacao_log_id === log.id,
      );
      if (bloqueado) {
        return {
          success: false,
          error: 'Este carrinho já entrou no forno. Exclua primeiro a entrada no forno.',
        };
      }
    }

    if (log.etapa === 'saida_forno') {
      const bloqueado = all.some(
        (x) =>
          x.etapa === 'entrada_embalagem' &&
          (x.dados_qualidade as EmbalagemQualityData | null)?.saida_forno_log_id === log.id,
      );
      if (bloqueado) {
        return {
          success: false,
          error: 'Este lançamento já foi recebido na embalagem. Exclua primeiro a entrada na embalagem.',
        };
      }
    }

    const permitidasSemMassaForno: ProductionStep[] = [
      'fermentacao',
      'saida_forno',
      'entrada_embalagem',
      'saida_embalagem',
    ];
    if (!permitidasSemMassaForno.includes(log.etapa)) {
      return { success: false, error: 'Exclusão não disponível para este tipo de registro.' };
    }

    await stepRepository.deleteById(log.id);
    await removerOrigemSinteticaOrfaAposExclusao(stepRepository, input.ordem_producao_id, log);
    if (log.etapa === 'saida_embalagem') {
      const orderRepository = new ProductionOrderRepository(supabase);
      await syncOrdemStatusAposSaidaEmbalagem(stepRepository, orderRepository, input.ordem_producao_id);
    }
    revalidateOrdemEtapasEstoque(input.ordem_producao_id, log.etapa);
    if (log.etapa === 'entrada_embalagem') {
      revalidatePath('/carrinhos');
    }
    return { success: true };
  } catch (error) {
    console.error('deleteRegistroEtapaProducao:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao excluir registro.',
    };
  }
}

/**
 * Anexa foto ao log da etapa `saida_embalagem` da ordem.
 * Se não houver log aberto, cria um novo log em andamento com qtd=0.
 */
export async function appendFotoToSaidaEmbalagemStepLog(input: {
  ordem_producao_id: string;
  photoUrl: string;
}) {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const stepRepository = new ProductionStepRepository(supabase);
  const orderRepository = new ProductionOrderRepository(supabase);
  const stepManager = new ProductionStepLogManager(stepRepository, orderRepository);

  try {
    const photoUrl = input.photoUrl.trim();
    if (!photoUrl) {
      return { success: false as const, error: 'URL da foto inválida.' };
    }

    const lastSaidaEmb = await stepRepository.findLastByOrderAndStep(
      input.ordem_producao_id,
      'saida_embalagem',
    );

    if (!lastSaidaEmb || lastSaidaEmb.fim != null) {
      const created = await stepManager.startStep({
        ordem_producao_id: input.ordem_producao_id,
        etapa: 'saida_embalagem',
        qtd_saida: 0,
        fotos: [photoUrl],
        dados_qualidade: {},
      });

      revalidatePath('/producao/fila');
      revalidatePath(`/producao/etapas/${input.ordem_producao_id}`);
      revalidatePath(`/producao/etapas/${input.ordem_producao_id}/saida-embalagem`);
      return { success: true as const, data: created };
    }

    const prevFotos = lastSaidaEmb.fotos ?? [];
    const merged = prevFotos.includes(photoUrl) ? prevFotos : [...prevFotos, photoUrl];
    const updated = await stepRepository.update(lastSaidaEmb.id, { fotos: merged });

    revalidatePath('/producao/fila');
    revalidatePath(`/producao/etapas/${input.ordem_producao_id}`);
    revalidatePath(`/producao/etapas/${input.ordem_producao_id}/saida-embalagem`);
    return { success: true as const, data: updated };
  } catch (error) {
    console.error('appendFotoToSaidaEmbalagemStepLog:', error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Erro ao anexar foto da saída da embalagem.',
    };
  }
}

function caixasFromSaidaEmbalagemLog(dq: unknown, qtdSaida: number | null | undefined): number | null {
  const d = dq as SaidaEmbalagemQualityData | null;
  const cr = d?.caixas_recebidas;
  if (cr != null && Number.isFinite(Number(cr))) return Math.round(Number(cr));
  if (qtdSaida != null && Number.isFinite(Number(qtdSaida)) && Number(qtdSaida) >= 0) {
    return Math.round(Number(qtdSaida));
  }
  return null;
}

/** Marca a OP como concluída após saída de embalagem (habilita entrada no estoque de produção). */
async function marcarOrdemConcluidaAposSaidaEmbalagem(
  orderRepository: ProductionOrderRepository,
  ordemProducaoId: string,
): Promise<void> {
  const order = await orderRepository.findById(ordemProducaoId);
  if (!order) return;
  const st = String(order.status ?? '').toLowerCase();
  if (st === 'cancelado' || st === 'concluido') return;
  await orderRepository.update(ordemProducaoId, { status: 'concluido' });
}

/** Reabre a OP se não restar nenhum lançamento de caixas na saída de embalagem. */
async function syncOrdemStatusAposSaidaEmbalagem(
  stepRepository: ProductionStepRepository,
  orderRepository: ProductionOrderRepository,
  ordemProducaoId: string,
): Promise<void> {
  const order = await orderRepository.findById(ordemProducaoId);
  if (!order) return;
  const st = String(order.status ?? '').toLowerCase();
  if (st === 'cancelado') return;

  const logs = await stepRepository.findByOrderId(ordemProducaoId);
  const temCaixas = logs.some(
    (l) =>
      l.etapa === 'saida_embalagem' &&
      caixasFromSaidaEmbalagemLog(l.dados_qualidade, l.qtd_saida) != null,
  );

  if (temCaixas) {
    await marcarOrdemConcluidaAposSaidaEmbalagem(orderRepository, ordemProducaoId);
    return;
  }
  if (st === 'concluido') {
    await orderRepository.update(ordemProducaoId, { status: 'saida_embalagem' });
  }
}

/**
 * Registra quantas caixas saíram / foram conferidas na saída da embalagem.
 * Finaliza o log da etapa e marca a ordem como concluída para contabilizar no estoque.
 */
export async function upsertSaidaEmbalagemCaixasRecebidas(input: {
  ordem_producao_id: string;
  caixas_recebidas: number;
}) {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const stepRepository = new ProductionStepRepository(supabase);
  const orderRepository = new ProductionOrderRepository(supabase);
  const stepManager = new ProductionStepLogManager(stepRepository, orderRepository);

  const caixas = Math.round(Number(input.caixas_recebidas));
  if (!Number.isFinite(caixas) || caixas < 0) {
    return { success: false as const, error: 'Informe um número inteiro de caixas (0 ou mais).' };
  }

  try {
    const lastSaidaEmb = await stepRepository.findLastByOrderAndStep(
      input.ordem_producao_id,
      'saida_embalagem',
    );

    const dqFinal: SaidaEmbalagemQualityData = {
      ...(lastSaidaEmb?.dados_qualidade != null && typeof lastSaidaEmb.dados_qualidade === 'object'
        ? (lastSaidaEmb.dados_qualidade as SaidaEmbalagemQualityData)
        : {}),
      caixas_recebidas: caixas,
    };

    let logId: string;
    const fotos = lastSaidaEmb?.fotos ?? [];

    if (!lastSaidaEmb || lastSaidaEmb.fim != null) {
      const created = await stepManager.startStep({
        ordem_producao_id: input.ordem_producao_id,
        etapa: 'saida_embalagem',
        qtd_saida: 0,
        dados_qualidade: dqFinal,
        fotos,
      });
      logId = created.id;
    } else {
      logId = lastSaidaEmb.id;
      await stepRepository.update(lastSaidaEmb.id, {
        dados_qualidade: dqFinal as QualityData,
        fotos,
      });
    }

    await stepManager.completeStep(logId, {
      qtd_saida: caixas,
      dados_qualidade: dqFinal,
      fotos,
    });

    await marcarOrdemConcluidaAposSaidaEmbalagem(orderRepository, input.ordem_producao_id);

    revalidateOrdemEtapasEstoque(input.ordem_producao_id, 'saida_embalagem');

    return { success: true as const };
  } catch (error) {
    console.error('upsertSaidaEmbalagemCaixasRecebidas:', error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Erro ao salvar contagem de caixas.',
    };
  }
}

const MAX_LATAS_ENTRADA_EMBALAGEM_POR_REGISTRO = 20;

/**
 * Ajusta a quantidade de latas (LT) de um registro já concluído de `entrada_embalagem`,
 * respeitando o saldo da saída do forno vinculada.
 */
export async function updateEntradaEmbalagemLogLatas(input: {
  log_id: string;
  ordem_producao_id: string;
  assadeiras: number;
}): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const stepRepository = new ProductionStepRepository(supabase);
  const latas = Math.round(Number(input.assadeiras));
  if (!Number.isFinite(latas) || latas < 1) {
    return { success: false as const, error: 'Informe um número inteiro de latas (mínimo 1).' };
  }
  if (latas > MAX_LATAS_ENTRADA_EMBALAGEM_POR_REGISTRO) {
    return {
      success: false as const,
      error: `Máximo de ${MAX_LATAS_ENTRADA_EMBALAGEM_POR_REGISTRO} latas por registro.`,
    };
  }

  try {
    const log = await stepRepository.findById(input.log_id);
    if (!log || log.ordem_producao_id !== input.ordem_producao_id) {
      return { success: false as const, error: 'Registro não encontrado.' };
    }
    if (log.etapa !== 'entrada_embalagem' || log.fim == null) {
      return {
        success: false as const,
        error: 'Só é possível ajustar latas em entradas na embalagem já concluídas.',
      };
    }

    const dq = log.dados_qualidade as EmbalagemQualityData | null;
    const saidaId = dq?.saida_forno_log_id?.trim();
    if (!saidaId) {
      return { success: false as const, error: 'Registro sem vínculo com saída do forno.' };
    }

    const saidaLog = await stepRepository.findById(saidaId);
    if (!saidaLog || saidaLog.etapa !== 'saida_forno' || saidaLog.fim == null) {
      return { success: false as const, error: 'Saída do forno não encontrada.' };
    }
    if (saidaLog.ordem_producao_id !== input.ordem_producao_id) {
      return { success: false as const, error: 'Vínculo inválido com a ordem de produção.' };
    }

    const dqS = saidaLog.dados_qualidade as SaidaFornoQualityData | null;
    if (dqS?.liberacao_carrinho_perda_total === true) {
      return {
        success: false as const,
        error: 'Este carrinho foi encerrado administrativamente; não é possível ajustar.',
      };
    }

    const logs = await stepRepository.findByOrderId(input.ordem_producao_id);
    const latasSaida = latasSaidaFornoDoLog(dqS);
    const consumidoTotal = sumLatasEntradaEmbalagemPorSaidaFornoLogId(logs, saidaId);
    let oldLatas =
      dq?.assadeiras != null && Number.isFinite(Number(dq.assadeiras))
        ? Math.round(Number(dq.assadeiras))
        : 0;
    if (oldLatas < 1 && log.qtd_saida != null && Number.isFinite(Number(log.qtd_saida))) {
      oldLatas = Math.max(0, Math.round(Number(log.qtd_saida)));
    }
    const consumidoOutros = consumidoTotal - oldLatas;
    const maxParaLog = latasSaida - consumidoOutros;
    if (latas > maxParaLog) {
      return {
        success: false as const,
        error: `No máximo ${maxParaLog} lata(s) para este carrinho (saldo da saída do forno).`,
      };
    }

    const merged = {
      ...(dq != null && typeof dq === 'object' ? dq : {}),
      assadeiras: latas,
    } as EmbalagemQualityData;

    await stepRepository.update(log.id, {
      qtd_saida: latas,
      dados_qualidade: merged as QualityData,
    });

    revalidatePath('/carrinhos');
    revalidateOrdemEtapasEstoque(input.ordem_producao_id, 'entrada_embalagem');
    return { success: true as const };
  } catch (error) {
    console.error('updateEntradaEmbalagemLogLatas:', error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Erro ao atualizar latas.',
    };
  }
}

export type CarrinhoSaidaFornoParaEmbalagemVM = {
  saida_forno_log_id: string;
  numero_carrinho: string;
  rotulo_exibicao: string;
  eh_registro_adiantado: boolean;
  latas_saida: number;
  latas_disponiveis: number;
  saida_fim: string;
  observacao_embalagem: string | null;
};

export type CarrinhoEntradaFornoParaSaidaVM = {
  numero_carrinho: string;
  entrada_forno_fim: string;
};

/**
 * Carrinhos com entrada no forno registrada (com latas), ainda não lançados na saída do forno.
 * Inclui entradas em aberto (`fim` null), como no fluxo normal e no adiantar de etapas na fila.
 */
export async function getEntradaFornoCarrinhosParaSaida(ordemProducaoId: string) {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const stepRepository = new ProductionStepRepository(supabase);

  try {
    const logs = await stepRepository.findByOrderId(ordemProducaoId);
    const ordRes = await getProductionOrderWithProduct(ordemProducaoId);
    const ua =
      ordRes.success && ordRes.data?.produto.unidades_assadeira != null
        ? Number(ordRes.data.produto.unidades_assadeira)
        : null;
    const uaOk = ua != null && ua > 0 ? ua : null;

    const entradaLogs = logs
      .filter((l) => l.etapa === 'entrada_forno')
      .filter((l) => ltFromFornoLogRow(l.qtd_saida, l.dados_qualidade, uaOk) > 0)
      .sort(
        (a, b) =>
          new Date(a.fim ?? a.inicio).getTime() - new Date(b.fim ?? b.inicio).getTime(),
      );
    const fermentacaoById = new Map<string, ProductionStepLog>();
    for (const log of logs) {
      if (log.etapa !== 'fermentacao') continue;
      fermentacaoById.set(log.id, log);
    }
    const saidaNumeros = new Set<string>();

    for (const log of logs) {
      if (log.etapa !== 'saida_forno' || log.fim == null) continue;
      const dq = log.dados_qualidade as SaidaFornoQualityData | null;
      const numero = String(dq?.numero_carrinho ?? '').trim();
      const normalizado = normalizeNumeroCarrinhoFermentacao(numero);
      if (!normalizado) continue;
      saidaNumeros.add(normalizado);
    }

    const vistos = new Set<string>();
    const data: CarrinhoEntradaFornoParaSaidaVM[] = [];

    for (const log of entradaLogs) {
      const dq = log.dados_qualidade as FornoQualityData | null;
      const fermentacaoLogId = String(dq?.fermentacao_log_id ?? '').trim();
      const fermentacaoLog = fermentacaoById.get(fermentacaoLogId);
      const dqFermentacao = fermentacaoLog?.dados_qualidade as FermentacaoQualityData | null | undefined;
      const numero = String(dqFermentacao?.numero_carrinho ?? '').trim();
      const normalizado = normalizeNumeroCarrinhoFermentacao(numero);
      if (!normalizado || saidaNumeros.has(normalizado) || vistos.has(normalizado)) continue;
      vistos.add(normalizado);
      data.push({
        numero_carrinho: numero,
        entrada_forno_fim: log.fim ?? log.inicio,
      });
    }

    return { success: true as const, data };
  } catch (error) {
    console.error('getEntradaFornoCarrinhosParaSaida:', error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Erro ao listar carrinhos da entrada do forno.',
    };
  }
}

/**
 * Carrinhos registrados na saída do forno para esta ordem, ainda com latas disponíveis para embalagem.
 */
export async function getSaidaFornoCarrinhosParaEmbalagem(ordemProducaoId: string) {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const stepRepository = new ProductionStepRepository(supabase);

  try {
    const logs = await stepRepository.findByOrderId(ordemProducaoId);
    const saidaLogs = logs
      .filter((l) => l.etapa === 'saida_forno' && l.fim != null)
      .sort((a, b) => new Date(a.fim!).getTime() - new Date(b.fim!).getTime());

    // Observação de embalagem é por ordem (igual para todos os carrinhos desta OP).
    let observacaoEmbalagem: string | null = null;
    {
      const { data: itemRow } = await supabase
        .from('ordens_producao_diarias_itens')
        .select('observacao_embalagem')
        .eq('ordens_producao_id', ordemProducaoId)
        .limit(1)
        .maybeSingle();
      const obsEmb = (itemRow as { observacao_embalagem?: string | null } | null)?.observacao_embalagem;
      if (obsEmb != null && String(obsEmb).trim() !== '') {
        observacaoEmbalagem = String(obsEmb).trim();
      }
    }

    const data: CarrinhoSaidaFornoParaEmbalagemVM[] = [];
    for (const s of saidaLogs) {
      const dq = s.dados_qualidade as SaidaFornoQualityData | null;
      if (dq?.liberacao_carrinho_perda_total === true) continue;
      const latasSaida = latasSaidaFornoDoLog(dq);
      if (latasSaida < 1) continue;
      const consumido = sumLatasEntradaEmbalagemPorSaidaFornoLogId(logs, s.id);
      const disp = latasSaida - consumido;
      if (disp <= 0) continue;
      const num = String(dq?.numero_carrinho ?? '').trim();
      const carRaw = num || '—';
      const rotulo = camposRotuloRegistroFila('saida_forno', s.dados_qualidade, carRaw, {
        bandejas: latasSaida,
      });
      data.push({
        saida_forno_log_id: s.id,
        numero_carrinho: carRaw,
        latas_saida: latasSaida,
        latas_disponiveis: disp,
        saida_fim: s.fim as string,
        observacao_embalagem: observacaoEmbalagem,
        ...rotulo,
      });
    }

    return { success: true as const, data };
  } catch (error) {
    console.error('getSaidaFornoCarrinhosParaEmbalagem:', error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Erro ao listar carrinhos da saída do forno.',
    };
  }
}

/**
 * Registra uma chegada na embalagem (vinculada a um log de saída do forno) e já conclui o log.
 */
export async function registerEntradaEmbalagemCarrinhoELatas(input: {
  ordem_producao_id: string;
  saida_forno_log_id: string;
  latas: number;
}) {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const stepRepository = new ProductionStepRepository(supabase);
  const orderRepository = new ProductionOrderRepository(supabase);
  const stepManager = new ProductionStepLogManager(stepRepository, orderRepository);

  const latas = Math.round(Number(input.latas));
  if (!input.saida_forno_log_id?.trim()) {
    return { success: false as const, error: 'Selecione um carrinho da saída do forno.' };
  }
  if (!Number.isFinite(latas) || latas < 1) {
    return { success: false as const, error: 'Informe um número inteiro de latas (mínimo 1).' };
  }
  if (latas > MAX_LATAS_ENTRADA_EMBALAGEM_POR_REGISTRO) {
    return {
      success: false as const,
      error: `Máximo de ${MAX_LATAS_ENTRADA_EMBALAGEM_POR_REGISTRO} latas por registro.`,
    };
  }

  try {
    const saidaLog = await stepRepository.findById(input.saida_forno_log_id);
    if (!saidaLog || saidaLog.etapa !== 'saida_forno' || saidaLog.fim == null) {
      return {
        success: false as const,
        error: 'Registro de saída do forno não encontrado ou ainda não concluído.',
      };
    }
    if (saidaLog.ordem_producao_id !== input.ordem_producao_id) {
      return { success: false as const, error: 'Este registro não pertence a esta ordem de produção.' };
    }

    const logs = await stepRepository.findByOrderId(input.ordem_producao_id);
    const dqS = saidaLog.dados_qualidade as SaidaFornoQualityData | null;
    if (dqS?.liberacao_carrinho_perda_total === true) {
      return {
        success: false as const,
        error: 'Este saldo foi encerrado administrativamente; não é possível registar na embalagem.',
      };
    }
    const latasSaida = latasSaidaFornoDoLog(dqS);
    const consumido = sumLatasEntradaEmbalagemPorSaidaFornoLogId(logs, saidaLog.id);
    const disponivel = latasSaida - consumido;
    if (disponivel < 1) {
      return { success: false as const, error: 'Não há latas disponíveis neste carrinho.' };
    }
    if (latas > disponivel) {
      return {
        success: false as const,
        error: `No máximo ${disponivel} lata(s) disponível(is) para este carrinho.`,
      };
    }

    const carrinho = String(dqS?.numero_carrinho ?? '').trim();
    if (!carrinho) {
      return { success: false as const, error: 'Saída do forno sem número de carrinho.' };
    }

    const dqPatch: EmbalagemQualityData = {
      numero_carrinho: carrinho,
      assadeiras: latas,
      saida_forno_log_id: saidaLog.id,
    };

    const started = await stepManager.startStep({
      ordem_producao_id: input.ordem_producao_id,
      etapa: 'entrada_embalagem',
      qtd_saida: latas,
      dados_qualidade: dqPatch,
      fotos: [],
    });

    await stepManager.completeStep(started.id, {
      qtd_saida: latas,
      dados_qualidade: dqPatch,
    });

    revalidatePath('/carrinhos');
    revalidatePath('/producao/fila');
    revalidatePath(`/producao/etapas/${input.ordem_producao_id}`);
    revalidatePath(`/producao/etapas/${input.ordem_producao_id}/entrada-embalagem`);

    return { success: true as const };
  } catch (error) {
    console.error('registerEntradaEmbalagemCarrinhoELatas:', error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Erro ao salvar entrada da embalagem.',
    };
  }
}

/**
 * Regista na embalagem todas as latas ainda disponíveis desta saída do forno (em blocos de até
 * {@link MAX_LATAS_ENTRADA_EMBALAGEM_POR_REGISTRO} por registo).
 */
export async function registerEntradaEmbalagemTodasLatasRestantes(input: {
  ordem_producao_id: string;
  saida_forno_log_id: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const stepRepository = new ProductionStepRepository(supabase);
  const saidaInicial = await stepRepository.findById(input.saida_forno_log_id);
  if (!saidaInicial || saidaInicial.etapa !== 'saida_forno' || saidaInicial.fim == null) {
    return { success: false, error: 'Registo de saída do forno não encontrado ou ainda não concluído.' };
  }
  if (saidaInicial.ordem_producao_id !== input.ordem_producao_id) {
    return { success: false, error: 'Este registo não pertence a esta ordem de produção.' };
  }

  const maxIter = 500;
  for (let i = 0; i < maxIter; i += 1) {
    const saidaLog = await stepRepository.findById(input.saida_forno_log_id);
    if (!saidaLog || saidaLog.etapa !== 'saida_forno' || saidaLog.fim == null) {
      return { success: false, error: 'Registo de saída do forno deixou de existir.' };
    }
    const logs = await stepRepository.findByOrderId(input.ordem_producao_id);
    const dqS = saidaLog.dados_qualidade as SaidaFornoQualityData | null;
    if (dqS?.liberacao_carrinho_perda_total === true) {
      return { success: false, error: 'Este saldo já foi encerrado administrativamente.' };
    }
    const latasSaida = latasSaidaFornoDoLog(dqS);
    const consumido = sumLatasEntradaEmbalagemPorSaidaFornoLogId(logs, saidaLog.id);
    const disponivel = latasSaida - consumido;
    if (disponivel < 1) {
      return { success: true };
    }
    const chunk = Math.min(MAX_LATAS_ENTRADA_EMBALAGEM_POR_REGISTRO, disponivel);
    const res = await registerEntradaEmbalagemCarrinhoELatas({
      ordem_producao_id: input.ordem_producao_id,
      saida_forno_log_id: input.saida_forno_log_id,
      latas: chunk,
    });
    if (!res.success) {
      return { success: false, error: res.error };
    }
  }
  return { success: false, error: 'Limite de iterações ao registar entradas na embalagem.' };
}

/**
 * Encerra o saldo pendente deste carrinho na saída do forno sem criar entradas na embalagem
 * (perda total / liberação administrativa na página Carrinhos).
 */
export async function encerrarSaldoCarrinhoPosFornoAdministrativo(input: {
  saida_forno_log_id: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const stepRepository = new ProductionStepRepository(supabase);

  try {
    const log = await stepRepository.findById(input.saida_forno_log_id);
    if (!log || log.etapa !== 'saida_forno' || log.fim == null) {
      return { success: false, error: 'Registo de saída do forno não encontrado ou ainda não concluído.' };
    }

    const logs = await stepRepository.findByOrderId(log.ordem_producao_id);
    const dqS = log.dados_qualidade as SaidaFornoQualityData | null;
    if (dqS?.liberacao_carrinho_perda_total === true) {
      return { success: true };
    }
    const latasSaida = latasSaidaFornoDoLog(dqS);
    const consumido = sumLatasEntradaEmbalagemPorSaidaFornoLogId(logs, log.id);
    const restantes = latasSaida - consumido;
    if (restantes < 1) {
      return { success: true };
    }

    const prev = log.dados_qualidade;
    const dadosAtualizados = {
      ...(prev != null && typeof prev === 'object' ? prev : {}),
      liberacao_carrinho_perda_total: true,
      liberacao_carrinho_perda_total_em: new Date().toISOString(),
    } as QualityData;

    await stepRepository.update(log.id, { dados_qualidade: dadosAtualizados });

    revalidatePath('/carrinhos');
    revalidatePath('/producao/fila');
    revalidatePath(`/producao/etapas/${log.ordem_producao_id}`);
    revalidatePath(`/producao/etapas/${log.ordem_producao_id}/entrada-forno`);
    revalidatePath(`/producao/etapas/${log.ordem_producao_id}/entrada-embalagem`);

    return { success: true };
  } catch (error) {
    console.error('encerrarSaldoCarrinhoPosFornoAdministrativo:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao encerrar saldo do carrinho.',
    };
  }
}

/**
 * Busca progresso de uma ordem de produção
 */
export async function getProductionProgress(
  ordemProducaoId: string,
  productInfo: {
    unidadeNomeResumido: string | null; // nome_resumido da tabela unidades
    package_units?: number | null;
    box_units?: number | null;
    unidades_assadeira?: number | null;
    receita_massa?: {
      receita_id?: string;
      receita_nome?: string | null;
      receita_codigo?: string | null;
      quantidade_por_produto: number;
    } | null;
  },
) {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const stepRepository = new ProductionStepRepository(supabase);
  const orderRepository = new ProductionOrderRepository(supabase);
  const progressCalculator = new ProductionProgressCalculator(stepRepository, orderRepository);

  try {
    const progress = await progressCalculator.calculateProgress(ordemProducaoId, productInfo);
    return { success: true, data: progress };
  } catch (error) {
    console.error('Erro ao calcular progresso:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao calcular progresso',
    };
  }
}

/**
 * Busca etapa em andamento de uma ordem de produção
 */
export async function getInProgressStep(ordemProducaoId: string) {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const stepRepository = new ProductionStepRepository(supabase);

  try {
    const logs = await stepRepository.findByOrderId(ordemProducaoId);
    const inProgress = logs.find((log) => log.fim === null);
    return { success: true, data: inProgress || null };
  } catch (error) {
    console.error('Erro ao buscar etapa em andamento:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao buscar etapa em andamento',
    };
  }
}

/**
 * Busca receitas produzidas de massa e fermentação
 */
export async function getReceitasProduzidas(ordemProducaoId: string) {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const stepRepository = new ProductionStepRepository(supabase);

  try {
    const logs = await stepRepository.findByOrderId(ordemProducaoId);

    const receitasMassa = sumReceitasBatidasFromMassaLogs(logs);

    // Buscar receitas de fermentação (converter qtd_saida para receitas)
    let receitasFermentacao = 0;
    const fermentacaoLog = logs.find((log) => log.etapa === 'fermentacao' && log.fim !== null);
    if (fermentacaoLog && fermentacaoLog.qtd_saida) {
      // Buscar ordem para obter quantidade_por_produto
      const orderRepository = new ProductionOrderRepository(supabase);
      const order = await orderRepository.findById(ordemProducaoId);
      if (order) {
        const { data: produtoReceitasRows } = await supabase
          .from('produto_receitas')
          .select(
            'quantidade_por_produto, receitas!produto_receitas_receita_id_fkey(tipo, ativo)',
          )
          .eq('produto_id', order.produto_id)
          .eq('ativo', true);

        type PRMassa = {
          quantidade_por_produto: number;
          tipo?: string | null;
          receitas?: { tipo?: string; ativo?: boolean | null } | null;
        };
        const produtoReceita = produtoReceitasRows?.find((row) =>
          isVinculoReceitaMassaAtiva(row as PRMassa),
        );
        if (produtoReceita) {
          const quantidadePorProduto = (produtoReceita as PRMassa).quantidade_por_produto;
          if (quantidadePorProduto > 0) {
            // Converter unidades para receitas
            receitasFermentacao = fermentacaoLog.qtd_saida / quantidadePorProduto;
          }
        }
      }
    }

    return {
      success: true,
      data: {
        receitasMassa,
        receitasFermentacao,
      },
    };
  } catch (error) {
    console.error('Erro ao buscar receitas produzidas:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao buscar receitas produzidas',
      data: {
        receitasMassa: 0,
        receitasFermentacao: 0,
      },
    };
  }
}

/**
 * Busca receitas de massa vinculadas a um produto
 */
export async function getReceitasMassaByProduto(produtoId: string) {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  try {
    const receitasMassa = await listReceitasMassaForProduto(supabase, produtoId);
    return { success: true, data: receitasMassa };
  } catch (error) {
    console.error('Erro ao buscar receitas de massa:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao buscar receitas',
    };
  }
}

/**
 * Busca todas as masseiras ativas
 */
export async function getMasseiras() {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  try {
    const { data, error } = await supabase
      .from('masseiras')
      .select('*')
      .eq('ativo', true)
      .order('nome');

    if (error) {
      throw new Error(`Erro ao buscar masseiras: ${error.message}`);
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Erro ao buscar masseiras:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao buscar masseiras',
    };
  }
}

/**
 * Busca ordem de produção com dados do produto
 */
export async function getProductionOrderWithProduct(ordemProducaoId: string) {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const orderRepository = new ProductionOrderRepository(supabase);

  const resolved = await resolveOrdemProducaoOperacionalId(supabase, ordemProducaoId);
  if ('error' in resolved) {
    return { success: false, error: resolved.error };
  }
  const opId = resolved.opId;

  const withFetchRetry = async <T>(fn: () => Promise<T>, attempts = 2): Promise<T> => {
    let lastErr: unknown;
    for (let i = 0; i < attempts; i += 1) {
      try {
        return await fn();
      } catch (e) {
        lastErr = e;
        const msg = e instanceof Error ? e.message.toLowerCase() : String(e).toLowerCase();
        const isFetchFailure = msg.includes('fetch failed') || msg.includes('econnreset');
        if (!isFetchFailure || i === attempts - 1) break;
      }
    }
    throw lastErr;
  };

  try {
    const order = await withFetchRetry(() => orderRepository.findById(opId));
    if (!order) {
      return { success: false, error: 'Ordem de produção não encontrada' };
    }

    // Buscar produto sem embed: PostgREST (schema interno) pode não expor FK produtos→unidades no cache (PGRST200).
    const { data: produto, error: produtoError } = await withFetchRetry(async () =>
      await supabase.from('produtos').select('*').eq('id', order.produto_id).single(),
    );

    if (produtoError || !produto) {
      return { success: false, error: 'Produto não encontrado' };
    }

    const unidadePadraoId = String(
      (produto as { unidade_padrao_id?: string | null }).unidade_padrao_id ?? '',
    ).trim();
    let unidadeNomeResumido: string | null = null;
    if (unidadePadraoId) {
      const { data: unRow } = await withFetchRetry(async () =>
        await supabase.from('unidades').select('nome_resumido').eq('id', unidadePadraoId).maybeSingle(),
      );
      const nr = (unRow as { nome_resumido?: string | null } | null)?.nome_resumido;
      unidadeNomeResumido = nr != null && String(nr).trim() !== '' ? String(nr).trim() : null;
    }

    const receitaMassa = await withFetchRetry(() =>
      resolveReceitaMassaForProduto(supabase, order.produto_id),
    );

    let numeroBuracosAssadeira = 0;
    let unidadesPorAssadeiraCadastro = 0;
    let tipoLataNome: string | null = null;
    const assadeiraId = order.assadeira_id?.trim() ?? '';
    if (assadeiraId) {
      const { data: assRow } = await withFetchRetry(async () =>
        await supabase
          .from('assadeiras')
          .select('numero_buracos, nome')
          .eq('id', assadeiraId)
          .maybeSingle(),
      );
      numeroBuracosAssadeira =
        Math.round(Number((assRow as { numero_buracos?: number })?.numero_buracos ?? 0)) || 0;
      const nomeRaw = (assRow as { nome?: string | null } | null)?.nome;
      tipoLataNome = nomeRaw != null && String(nomeRaw).trim() !== '' ? String(nomeRaw).trim() : null;
      const { data: paRow } = await withFetchRetry(async () =>
        await supabase
          .from('produto_assadeiras')
          .select('unidades_por_assadeira')
          .eq('produto_id', order.produto_id)
          .eq('assadeira_id', assadeiraId)
          .maybeSingle(),
      );
      unidadesPorAssadeiraCadastro =
        Math.round(
          Number((paRow as { unidades_por_assadeira?: number })?.unidades_por_assadeira ?? 0),
        ) || 0;
    }

    const opConsumoInput = {
      qtd_planejada: order.qtd_planejada,
      assadeira_id: order.assadeira_id,
      numeroBuracosAssadeira: numeroBuracosAssadeira,
      unidadesPorAssadeiraCadastro: unidadesPorAssadeiraCadastro,
    };

    const productInfo: ProductConversionInfo = {
      unidadeNomeResumido,
      package_units: (produto as { package_units?: number | null }).package_units ?? null,
      box_units: (produto as { box_units?: number | null }).box_units ?? null,
      unidades_assadeira: (produto as { unidades_assadeira?: number | null }).unidades_assadeira ?? null,
      receita_massa: receitaMassa ?? undefined,
    };

    const unidadesPorLataOp = unidadesPorLataResolvidaParaOp(opConsumoInput, productInfo);
    const productInfoComLata = {
      ...productInfo,
      unidades_assadeira: unidadesPorLataOp ?? productInfo.unidades_assadeira,
    };

    const planejadoUnidadesConsumo = planejadoUnidadesConsumoFromOp(
      opConsumoInput,
      productInfoComLata,
    );

    // Caixas planejadas da ordem diária (conversão já considerando o tipo de caixa escolhido):
    // fonte de verdade para a meta de caixas na saída de embalagem.
    let caixasPlanejadas: number | null = null;
    let observacaoProducao: string | null = null;
    // Sem maybeSingle(): uma OP pode ter mais de um item diário ligado; maybeSingle devolveria null e perderia os dados.
    const { data: diariaItens } = await withFetchRetry(async () =>
      await supabase
        .from('ordens_producao_diarias_itens')
        .select('caixas_estimadas, observacao_producao, observacao')
        .eq('ordens_producao_id', opId),
    );
    const itensDiaria = (Array.isArray(diariaItens) ? diariaItens : []) as Array<{
      caixas_estimadas?: number | null;
      observacao_producao?: string | null;
      observacao?: string | null;
    }>;
    for (const di of itensDiaria) {
      const cxRaw = di.caixas_estimadas;
      if (cxRaw != null && Number.isFinite(Number(cxRaw)) && Number(cxRaw) > 0) {
        caixasPlanejadas = Math.round(Number(cxRaw));
        break;
      }
    }
    const obsDoItem = (di: { observacao_producao?: string | null; observacao?: string | null }): string | null => {
      const p = di.observacao_producao;
      if (p != null && String(p).trim() !== '') return String(p).trim();
      const l = di.observacao;
      if (l != null && String(l).trim() !== '') return String(l).trim();
      return null;
    };
    for (const di of itensDiaria) {
      const obs = obsDoItem(di);
      if (obs) {
        observacaoProducao = obs;
        break;
      }
    }

    // Fallback: o vínculo reverso pode apontar para uma OP duplicada/temporária sem o item editado.
    // Recupera a observação pelo item da MESMA data de produção e produto (identifica o pedido do dia).
    if (observacaoProducao == null) {
      const dataOp = String((order as { data_producao?: string | null }).data_producao ?? '').slice(0, 10);
      const produtoIdOrder = String(order.produto_id ?? '').trim();
      if (dataOp && produtoIdOrder) {
        const { data: candItens } = await withFetchRetry(async () =>
          await supabase
            .from('ordens_producao_diarias_itens')
            .select('observacao_producao, observacao, ordem_diaria_id')
            .eq('produto_id', produtoIdOrder),
        );
        const cands = (Array.isArray(candItens) ? candItens : []) as Array<{
          observacao_producao?: string | null;
          observacao?: string | null;
          ordem_diaria_id?: string | null;
        }>;
        const comObs = cands.filter((c) => obsDoItem(c) != null);
        if (comObs.length > 0) {
          const diariaIds = [
            ...new Set(comObs.map((c) => String(c.ordem_diaria_id ?? '').trim()).filter(Boolean)),
          ];
          const dataPorDiaria = new Map<string, string>();
          if (diariaIds.length > 0) {
            const { data: hdrs } = await withFetchRetry(async () =>
              await supabase
                .from('ordens_producao_diarias')
                .select('id, data_producao')
                .in('id', diariaIds),
            );
            for (const h of (hdrs ?? []) as Array<{ id: string; data_producao?: string | null }>) {
              dataPorDiaria.set(String(h.id), String(h.data_producao ?? '').slice(0, 10));
            }
          }
          const mesmaData = comObs.find(
            (c) => dataPorDiaria.get(String(c.ordem_diaria_id ?? '').trim()) === dataOp,
          );
          observacaoProducao = obsDoItem(mesmaData ?? comObs[0]);
        }
      }
    }

    return {
      success: true,
      data: {
        ...order,
        planejadoUnidadesConsumo,
        caixasPlanejadas,
        tipoLataNome,
        observacaoProducao,
        produto: {
          ...produto,
          unidadeNomeResumido,
          receita_massa: receitaMassa,
          unidades_assadeira: productInfoComLata.unidades_assadeira,
        },
      },
    };
  } catch (error) {
    console.error('Erro ao buscar ordem de produção:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao buscar ordem de produção',
    };
  }
}

/**
 * Registra saída do forno (carrinho + bandejas) em um único passo: log concluído.
 * Bandejas são tratadas como LT na comparação com a entrada no forno.
 */
export async function registerSaidaForno(input: {
  ordem_producao_id: string;
  numero_carrinho: string;
  bandejas: number;
}) {
  const MAX_LATAS_POR_CARRINHO_SAIDA_FORNO = 20;
  const carrinho = input.numero_carrinho.trim();
  const bandejas = Math.round(Number(input.bandejas));
  if (!carrinho) {
    return { success: false, error: 'Informe o número do carrinho.' };
  }
  if (!Number.isFinite(bandejas) || bandejas < 1) {
    return { success: false, error: 'Informe um número inteiro de bandejas (mínimo 1).' };
  }
  if (bandejas > MAX_LATAS_POR_CARRINHO_SAIDA_FORNO) {
    return {
      success: false,
      error: `Máximo de ${MAX_LATAS_POR_CARRINHO_SAIDA_FORNO} latas por carrinho na saída do forno.`,
    };
  }

  const supabase = supabaseClientFactory.createServiceRoleClient();
  const stepRepository = new ProductionStepRepository(supabase);
  const orderRepository = new ProductionOrderRepository(supabase);
  const stepManager = new ProductionStepLogManager(stepRepository, orderRepository);

  const ordRes = await getProductionOrderWithProduct(input.ordem_producao_id);
  if (!ordRes.success || !ordRes.data) {
    return { success: false, error: ordRes.error || 'Ordem não encontrada' };
  }

  const ua = ordRes.data.produto.unidades_assadeira;
  const uaNum = ua != null && Number(ua) > 0 ? Number(ua) : null;
  const qtdSaida = uaNum != null ? bandejas * uaNum : bandejas;

  const norm = normalizeNumeroCarrinhoFermentacao(carrinho);
  const disponibilidade = await assertCarrinhoDisponivelParaSaidaForno({
    supabase,
    numeroNormalizado: norm,
    numeroParaExibir: carrinho,
  });
  if (!disponibilidade.ok) {
    return { success: false, error: disponibilidade.error };
  }

  const dq: SaidaFornoQualityData = { numero_carrinho: carrinho, bandejas };

  try {
    const started = await stepManager.startStep({
      ordem_producao_id: input.ordem_producao_id,
      etapa: 'saida_forno',
      qtd_saida: 0,
      dados_qualidade: dq,
      fotos: [],
    });
    const completed = await stepManager.completeStep(started.id, {
      qtd_saida: qtdSaida,
      dados_qualidade: dq,
      fotos: [],
    });

    revalidatePath('/producao/fila');
    revalidatePath(`/producao/etapas/${input.ordem_producao_id}`);
    revalidatePath(`/producao/etapas/${input.ordem_producao_id}/entrada-forno`);
    revalidatePath(`/producao/etapas/${input.ordem_producao_id}/saida-forno`);
    revalidatePath('/carrinhos');

    return { success: true, data: completed };
  } catch (error) {
    console.error('Erro ao registrar saída do forno:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao registrar saída do forno',
    };
  }
}
