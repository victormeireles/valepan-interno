'use server';

import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { isVinculoReceitaMassaAtiva } from '@/lib/utils/receita-massa-eligibility';
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
import { sumLatasFromFornoLogRows } from '@/lib/utils/forno-volume';
import { validateCompleteProductionStepQuality } from '@/lib/production/production-step-complete-validation';
import {
  assertCarrinhoFermentacaoUnicoNaOrdem,
  normalizeNumeroCarrinhoFermentacao,
} from '@/lib/production/fermentacao-carrinho-uniqueness';
import { assertNovaEntradaFornoSemDuplicata } from '@/lib/production/entrada-forno-start-validation';
import {
  latasSaidaFornoDoLog,
  sumLatasEntradaEmbalagemPorSaidaFornoLogId,
} from '@/lib/utils/entrada-embalagem-saida';

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
    if (input.etapa === 'entrada_forno') {
      const dqForno = input.dados_qualidade as FornoQualityData | undefined;
      const ordemLogs = await stepRepository.findByOrderId(input.ordem_producao_id);
      const dup = assertNovaEntradaFornoSemDuplicata(ordemLogs, dqForno?.fermentacao_log_id);
      if (!dup.ok) {
        return { success: false, error: dup.error };
      }
    }

    const createInput: CreateProductionStepLogInput = {
      ordem_producao_id: input.ordem_producao_id,
      etapa: input.etapa,
      usuario_id: input.usuario_id,
      qtd_saida: input.qtd_saida,
      perda_qtd: input.perda_qtd || 0,
      dados_qualidade: input.dados_qualidade,
      fotos: input.fotos || [],
    };

    const log = await stepManager.startStep(createInput);

    revalidatePath('/producao/fila');
    revalidatePath(`/producao/etapas/${input.ordem_producao_id}`);
    if (input.etapa === 'entrada_forno') {
      revalidatePath(`/producao/etapas/${input.ordem_producao_id}/entrada-forno`);
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

    const produtoIdsOrdens = [...new Set((ordens ?? []).map((o) => o.produto_id).filter(Boolean))];
    const uaByProduto = new Map<string, number | null>();
    if (produtoIdsOrdens.length > 0) {
      const { data: prodRows, error: errProd } = await supabase
        .from('produtos')
        .select('id, unidades_assadeira')
        .in('id', produtoIdsOrdens);
      if (errProd) {
        console.error('getTotalLatasEntradaFornoHoje produtos:', errProd);
        return 0;
      }
      for (const p of prodRows ?? []) {
        const ua = p.unidades_assadeira;
        const uaOk = ua != null && Number(ua) > 0 ? Number(ua) : null;
        uaByProduto.set(p.id, uaOk);
      }
    }

    const uaByOrder = new Map<string, number | null>();
    for (const o of ordens ?? []) {
      const uaOk = uaByProduto.get(o.produto_id as string) ?? null;
      uaByOrder.set(o.id as string, uaOk);
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

/**
 * Registra quantas caixas saíram / foram conferidas na saída da embalagem.
 * Reutiliza o log em aberto ou cria um novo (mesma política da foto).
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

    const dqPatch: SaidaEmbalagemQualityData = { caixas_recebidas: caixas };

    if (!lastSaidaEmb || lastSaidaEmb.fim != null) {
      await stepManager.startStep({
        ordem_producao_id: input.ordem_producao_id,
        etapa: 'saida_embalagem',
        qtd_saida: 0,
        dados_qualidade: dqPatch,
        fotos: [],
      });
    } else {
      const prev = lastSaidaEmb.dados_qualidade;
      const merged = {
        ...(prev != null && typeof prev === 'object' ? prev : {}),
        ...dqPatch,
      } as QualityData;
      await stepRepository.update(lastSaidaEmb.id, { dados_qualidade: merged });
    }

    revalidatePath('/producao/fila');
    revalidatePath(`/producao/etapas/${input.ordem_producao_id}`);
    revalidatePath(`/producao/etapas/${input.ordem_producao_id}/saida-embalagem`);

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

export type CarrinhoSaidaFornoParaEmbalagemVM = {
  saida_forno_log_id: string;
  numero_carrinho: string;
  latas_saida: number;
  latas_disponiveis: number;
  saida_fim: string;
};

export type CarrinhoEntradaFornoParaSaidaVM = {
  numero_carrinho: string;
  entrada_forno_fim: string;
};

/**
 * Carrinhos com entrada no forno concluída para a ordem, ainda não lançados na saída do forno.
 */
export async function getEntradaFornoCarrinhosParaSaida(ordemProducaoId: string) {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const stepRepository = new ProductionStepRepository(supabase);

  try {
    const logs = await stepRepository.findByOrderId(ordemProducaoId);
    const entradaLogs = logs
      .filter((l) => l.etapa === 'entrada_forno' && l.fim != null)
      .sort((a, b) => new Date(a.fim!).getTime() - new Date(b.fim!).getTime());
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
        entrada_forno_fim: log.fim as string,
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

    const data: CarrinhoSaidaFornoParaEmbalagemVM[] = [];
    for (const s of saidaLogs) {
      const dq = s.dados_qualidade as SaidaFornoQualityData | null;
      const latasSaida = latasSaidaFornoDoLog(dq);
      if (latasSaida < 1) continue;
      const consumido = sumLatasEntradaEmbalagemPorSaidaFornoLogId(logs, s.id);
      const disp = latasSaida - consumido;
      if (disp <= 0) continue;
      const num = String(dq?.numero_carrinho ?? '').trim();
      data.push({
        saida_forno_log_id: s.id,
        numero_carrinho: num || '—',
        latas_saida: latasSaida,
        latas_disponiveis: disp,
        saida_fim: s.fim as string,
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
        const { data: prRows } = await supabase
          .from('produto_receitas')
          .select('quantidade_por_produto, receita_id')
          .eq('produto_id', order.produto_id)
          .eq('ativo', true);

        type PRMassa = {
          quantidade_por_produto: number;
          tipo?: string | null;
          receitas?: { tipo?: string; ativo?: boolean | null } | null;
        };

        let produtoReceita: { quantidade_por_produto: number } | undefined;
        if (prRows?.length) {
          const rids = [...new Set(prRows.map((r) => r.receita_id).filter(Boolean))];
          const { data: recRows } = await supabase.from('receitas').select('id, tipo, ativo').in('id', rids);
          const recById = new Map((recRows ?? []).map((r) => [r.id, r]));
          for (const row of prRows) {
            const rec = row.receita_id ? recById.get(row.receita_id) : undefined;
            const item: PRMassa = {
              quantidade_por_produto: row.quantidade_por_produto,
              receitas: rec ? { tipo: rec.tipo, ativo: rec.ativo } : null,
            };
            if (isVinculoReceitaMassaAtiva(item)) {
              produtoReceita = row;
              break;
            }
          }
        }

        if (produtoReceita) {
          const quantidadePorProduto = produtoReceita.quantidade_por_produto;
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
    const { data: prRows, error } = await supabase
      .from('produto_receitas')
      .select('receita_id')
      .eq('produto_id', produtoId)
      .eq('ativo', true);

    if (error) {
      throw new Error(`Erro ao buscar receitas: ${error.message}`);
    }

    if (!prRows?.length) {
      return { success: true, data: [] };
    }

    const receitaIds = [...new Set(prRows.map((r) => r.receita_id).filter(Boolean))];
    const { data: receitasRows, error: recErr } = await supabase
      .from('receitas')
      .select('id, nome, codigo, tipo, ativo')
      .in('id', receitaIds);

    if (recErr) {
      throw new Error(`Erro ao buscar receitas: ${recErr.message}`);
    }

    const receitasMassa = (receitasRows ?? []).filter((rec) => {
      const pr = prRows.find((p) => p.receita_id === rec.id);
      if (!pr) return false;
      return isVinculoReceitaMassaAtiva({
        receitas: { tipo: rec.tipo, ativo: rec.ativo },
      });
    });

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
    const order = await withFetchRetry(() => orderRepository.findById(ordemProducaoId));
    if (!order) {
      return { success: false, error: 'Ordem de produção não encontrada' };
    }

    const { data: produto, error: produtoError } = await withFetchRetry(async () =>
      await supabase.from('produtos').select('*').eq('id', order.produto_id).single(),
    );

    if (produtoError || !produto) {
      return { success: false, error: 'Produto não encontrado' };
    }

    let unidadeNomeResumido: string | null = null;
    const uid = produto.unidade_padrao_id;
    if (uid) {
      const { data: unRow } = await supabase
        .from('unidades')
        .select('nome_resumido')
        .eq('id', uid)
        .maybeSingle();
      unidadeNomeResumido = unRow?.nome_resumido ?? null;
    }

    const { data: prList, error: receitasError } = await withFetchRetry(async () =>
      await supabase
        .from('produto_receitas')
        .select('quantidade_por_produto, receita_id')
        .eq('produto_id', order.produto_id)
        .eq('ativo', true),
    );

    if (receitasError) {
      console.error('Erro ao buscar receitas vinculadas:', receitasError);
    }

    let receitaMassa = null;
    if (prList && prList.length > 0) {
      const rids = [...new Set(prList.map((p) => p.receita_id).filter(Boolean))];
      const { data: recRows } = await supabase.from('receitas').select('id, tipo, ativo').in('id', rids);
      const recById = new Map((recRows ?? []).map((r) => [r.id, r]));
      for (const pr of prList) {
        const rec = pr.receita_id ? recById.get(pr.receita_id) : undefined;
        const item = {
          quantidade_por_produto: pr.quantidade_por_produto,
          receitas: rec ? { tipo: rec.tipo, ativo: rec.ativo } : null,
        };
        if (isVinculoReceitaMassaAtiva(item)) {
          receitaMassa = { quantidade_por_produto: pr.quantidade_por_produto };
          break;
        }
      }
    }

    return {
      success: true,
      data: {
        ...order,
        produto: {
          ...produto,
          unidadeNomeResumido,
          receita_massa: receitaMassa,
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

    return { success: true, data: completed };
  } catch (error) {
    console.error('Erro ao registrar saída do forno:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao registrar saída do forno',
    };
  }
}
