'use server';

import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { revalidatePath } from 'next/cache';
import { isVinculoReceitaMassaAtiva } from '@/lib/utils/receita-massa-eligibility';
import { listCarrinhosDisponiveisForOrdemFromSnapshots } from '@/lib/utils/forno-carrinhos-disponiveis';
import { ltFromFornoLogRow, sumLatasFromFornoLogRows } from '@/lib/utils/forno-volume';
import {
  latasFromEntradaEmbalagemLog,
  maxLatasEditaveisEntradaEmbalagemLog,
} from '@/lib/utils/entrada-embalagem-saida';
import { bandejasFromSaidaFornoLog } from '@/lib/utils/saida-forno-volume';
import type { ProductionStepLog } from '@/domain/types/producao-etapas';
import type { SaidaFornoQualityData } from '@/domain/types/producao-etapas';
import { estoqueService } from '@/lib/services/estoque-service';
import type { EstoqueRecord, Quantidade } from '@/domain/types/inventario';
import {
  unidadesConsumoParaQuantidadePlanejada,
  quantidadeEstoqueParaUnidadesConsumo,
  type ProductConversionInfo,
} from '@/lib/utils/production-conversions';
import {
  planejadoUnidadesConsumoFromOp,
  unidadesPorLataResolvidaParaOp,
} from '@/lib/production/ordem-producao-conversions';
import {
  montarLatasUsoResumo,
  type AssadeiraEstoqueInfo,
  type ItemLataUso,
  type LataUsoTipoResumo,
} from '@/lib/production/latas-uso-resumo';
import { ltFromFermentacaoLog } from '@/lib/utils/fermentacao-progresso';
import { formatIntegerWithThousands, formatNumberWithThousands } from '@/lib/utils/number-utils';
import { isGoogleServiceAccountConfigured } from '@/lib/googleSheets';
import type { OrdemProducaoLataSelecao } from '@/domain/types/ordem-producao';
import type { Json } from '@/types/database';
import { normalizeToISODate } from '@/lib/utils/date-utils';
import {
  resolveAssadeiraIdFromLataSelecao,
  type ProdutoUnidadesLataMeta,
} from '@/lib/production/ordem-producao-assadeira';
import {
  loadProdutoReceitasMassaLinkRows,
  type ProdutoReceitaMassaLinkRow,
} from '@/lib/production/produto-receita-massa';
import {
  insertOrdemProducaoForDiariaItem,
  updateOrdemProducaoForDiariaItem,
  fetchProdutoMetaForAssadeira,
  fetchAssadeiraCandidatos,
  type DiariaHeaderDates,
} from '@/lib/production/ordem-producao-op-sync';
import { estimateCaixasFromLatas } from '@/lib/production/ordem-producao-conversions';
import { camposRotuloRegistroFila } from '@/lib/production/registro-adiantado-fila';

const PATH_PRODUCAO_ORDEM_DIARIA = '/producao/ordem-producao';

export type ClienteOrdemProducaoOpcao = { id: string; nomeFantasia: string };

/** Clientes ativos para multiseleção na ordem de produção diária (nome guardado = nome_fantasia). */
export async function listClientesOrdemProducaoDiaria(): Promise<
  { success: true; data: ClienteOrdemProducaoOpcao[] } | { success: false; error: string }
> {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const { data, error } = await supabase
    .from('clientes')
    .select('id, nome_fantasia')
    .order('nome_fantasia', { ascending: true });
  if (error) return { success: false, error: error.message };
  const rows = (data ?? []) as { id: string; nome_fantasia: string | null }[];
  return {
    success: true,
    data: rows.map((r) => ({
      id: r.id,
      nomeFantasia: String(r.nome_fantasia ?? '').trim() || '—',
    })),
  };
}

interface CreateProductionOrderParams {
  produtoId: string;
  qtdPlanejada: number;
  pedidoId?: string;
  prioridade?: number; // 0=Normal, 1=Alta, 2=Urgente
  dataProducao?: string;
  /** Assadeira permitida em `produto_assadeiras`; null = inferir na fila pelo cadastro do produto. */
  assadeiraId?: string | null;
}

interface UpdateProductionOrderParams {
  ordemId: string;
  produtoId: string;
  qtdPlanejada: number;
  prioridade?: number; // 0=Normal, 1=Alta, 2=Urgente
  dataProducao?: string;
  assadeiraId?: string | null;
}

export type AssadeiraOpcaoOrdemProducao = {
  id: string;
  nome: string;
  unidades_por_assadeira: number;
  /** `assadeiras.numero_buracos` — usado na conversão latas → unidades (prioridade sobre unidades_por_assadeira). */
  numero_buracos: number;
  /** `assadeiras.quantidade_latas` — estoque físico do tipo (aviso de divisão em lotes). */
  quantidade_latas: number;
  ordem: number;
};

/** Lista assadeiras vinculadas ao produto (modal Nova ordem / planejamento). Opcionalmente exclui latas bloqueadas para o cliente. */
export async function getAssadeirasDisponiveisParaOrdemProducao(
  produtoId: string,
  clienteId?: string | null,
): Promise<
  { success: true; data: AssadeiraOpcaoOrdemProducao[] } | { success: false; error: string }
> {
  const id = produtoId?.trim();
  if (!id) {
    return { success: true, data: [] };
  }
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const { data: paRows, error: paErr } = await supabase
    .from('produto_assadeiras')
    .select('assadeira_id, unidades_por_assadeira')
    .eq('produto_id', id);

  if (paErr) {
    return { success: false, error: paErr.message };
  }

  const byAid = new Map<string, number>();
  for (const r of paRows ?? []) {
    const aid = String((r as { assadeira_id?: string }).assadeira_id ?? '').trim();
    const u = Math.round(Number((r as { unidades_por_assadeira?: number }).unidades_por_assadeira));
    if (!aid || !Number.isFinite(u) || u <= 0) continue;
    byAid.set(aid, u);
  }

  const aids = [...byAid.keys()];
  const assMap = new Map<
    string,
    { id: string; nome: string; ordem: number; numero_buracos: number; quantidade_latas: number }
  >();
  if (aids.length > 0) {
    const { data: assRows, error: assErr } = await supabase
      .from('assadeiras')
      .select('id, nome, ordem, numero_buracos, quantidade_latas')
      .in('id', aids);
    if (assErr) {
      return { success: false, error: assErr.message };
    }
    for (const a of assRows ?? []) {
      const row = a as {
        id: string;
        nome?: string | null;
        ordem?: number | null;
        numero_buracos?: number | null;
        quantidade_latas?: number | null;
      };
      const nb = Math.round(Number(row.numero_buracos ?? 0));
      const ql = Math.round(Number(row.quantidade_latas ?? 0));
      assMap.set(row.id, {
        id: row.id,
        nome: (row.nome ?? '').trim(),
        ordem: row.ordem ?? 0,
        numero_buracos: Number.isFinite(nb) && nb > 0 ? nb : 0,
        quantidade_latas: Number.isFinite(ql) && ql > 0 ? ql : 0,
      });
    }
  }

  const out: AssadeiraOpcaoOrdemProducao[] = [];
  for (const [aid, u] of byAid) {
    const a = assMap.get(aid);
    if (!a) continue;
    out.push({
      id: aid,
      nome: a.nome || '—',
      ordem: a.ordem,
      unidades_por_assadeira: u,
      numero_buracos: a.numero_buracos,
      quantidade_latas: a.quantidade_latas,
    });
  }
  out.sort((x, y) => x.ordem - y.ordem || x.nome.localeCompare(y.nome, 'pt-BR', { sensitivity: 'base' }));

  const cid = clienteId?.trim();
  if (!cid) {
    return { success: true, data: out };
  }

  const { data: bloqs, error: bloqErr } = await supabase
    .from('cliente_assadeira_bloqueios')
    .select('assadeira_id')
    .eq('cliente_id', cid);

  if (bloqErr) {
    return { success: true, data: out };
  }

  const blocked = new Set(
    (bloqs ?? []).map((r: { assadeira_id: string }) => String(r.assadeira_id)),
  );
  return { success: true, data: out.filter((o) => !blocked.has(o.id)) };
}

/**
 * Dados para o `<select>` de lata na ordem diária: opções do cadastro (`produto_assadeiras` + nomes)
 * e `selectedAssadeiraId` coerente com `tipoLataGuardado` (UUID de assadeira cadastrada; valor desconhecido → primeira opção).
 */
export async function getOrdemProducaoDiariaLataPicker(
  produtoId: string,
  tipoLataGuardado: string,
): Promise<
  | {
      success: true;
      options: AssadeiraOpcaoOrdemProducao[];
      selectedAssadeiraId: string | null;
      /** `produtos.box_units` para preview latas → caixas. */
      boxUnits: number | null;
    }
  | { success: false; error: string }
> {
  const ass = await getAssadeirasDisponiveisParaOrdemProducao(produtoId);
  if (!ass.success) return ass;
  const pid = produtoId?.trim() ?? '';
  let boxUnits: number | null = null;
  if (pid) {
    const supabase = supabaseClientFactory.createServiceRoleClient();
    const { data: pr } = await supabase
      .from('produtos')
      .select('box_units')
      .eq('id', pid)
      .maybeSingle();
    const bu = (pr as { box_units?: number | null })?.box_units;
    if (bu != null && Number(bu) > 0) boxUnits = Math.round(Number(bu));
  }
  if (!pid || ass.data.length === 0) {
    return {
      success: true,
      options: ass.data,
      selectedAssadeiraId: null,
      boxUnits,
    };
  }
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const metaRow = await fetchProdutoMetaForAssadeira(supabase, pid);
  const candidatos = await fetchAssadeiraCandidatos(supabase, pid);
  const metaFallback: ProdutoUnidadesLataMeta = {
    unidades_assadeira: null,
    unidades_lata_antiga: null,
    unidades_lata_nova: null,
  };
  const meta = metaRow ?? (candidatos.length > 0 ? metaFallback : null);
  const g = String(tipoLataGuardado ?? '').trim();
  let selected: string | null = null;
  if (meta && candidatos.length > 0) {
    selected = resolveAssadeiraIdFromLataSelecao(g, meta, candidatos);
  } else if (ass.data.length > 0) {
    selected = ass.data[0]!.id;
  }
  return {
    success: true,
    options: ass.data,
    selectedAssadeiraId: selected,
    boxUnits,
  };
}

async function validarAssadeiraIdParaProduto(
  supabase: ReturnType<typeof supabaseClientFactory.createServiceRoleClient>,
  produtoId: string,
  assadeiraId: string | null | undefined,
  clienteId?: string | null,
): Promise<{ ok: true; value: string | null } | { ok: false; error: string }> {
  const t = assadeiraId?.trim() ?? '';
  if (!t) return { ok: true, value: null };
  const { data, error } = await supabase
    .from('produto_assadeiras')
    .select('assadeira_id')
    .eq('produto_id', produtoId)
    .eq('assadeira_id', t)
    .maybeSingle();
  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data) {
    return {
      ok: false,
      error: 'O tipo de lata escolhido não está permitido para este produto.',
    };
  }

  const cid = clienteId?.trim();
  if (cid) {
    const { data: bloq, error: bloqErr } = await supabase
      .from('cliente_assadeira_bloqueios')
      .select('id')
      .eq('cliente_id', cid)
      .eq('assadeira_id', t)
      .maybeSingle();
    if (!bloqErr && bloq) {
      return {
        ok: false,
        error: 'Esta lata está bloqueada para o cliente do pedido (exclusão no cadastro de latas).',
      };
    }
  }

  return { ok: true, value: t };
}

export async function createProductionOrder(params: CreateProductionOrderParams) {
  // Usando Service Role para garantir acesso total às tabelas no server-side
  const supabase = supabaseClientFactory.createServiceRoleClient();

  try {
    // 1. Gerar código do lote (OP-YYYYMMDD-Sequence)
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const lotePrefix = `OP-${dateStr}-`;

    const { data: lastOp } = await supabase
      .from('ordens_producao')
      .select('lote_codigo')
      .ilike('lote_codigo', `${lotePrefix}%`)
      .order('lote_codigo', { ascending: false })
      .limit(1)
      .maybeSingle();

    let sequence = 1;
    if (lastOp?.lote_codigo) {
      const parts = lastOp.lote_codigo.split('-');
      const seqPart = parts[2];
      if (seqPart != null && !Number.isNaN(parseInt(seqPart, 10))) {
        sequence = parseInt(seqPart, 10) + 1;
      }
    }

    const loteCodigo = `${lotePrefix}${String(sequence).padStart(3, '0')}`;

    // 2. Criar a OP
    const dataProducao = params.dataProducao 
      ? new Date(params.dataProducao).toISOString()
      : new Date().toISOString();

    const { data: maxOrdRow } = await supabase
      .from('ordens_producao')
      .select('ordem_planejamento')
      .eq('status', 'planejado')
      .not('ordem_planejamento', 'is', null)
      .order('ordem_planejamento', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrdemPlanejamento =
      maxOrdRow?.ordem_planejamento != null &&
      !Number.isNaN(Number(maxOrdRow.ordem_planejamento))
        ? Number(maxOrdRow.ordem_planejamento) + 1
        : 1;

    let clienteIdParaLata: string | null = null;
    if (params.pedidoId?.trim()) {
      const { data: pedRow } = await supabase
        .from('pedidos')
        .select('cliente_id')
        .eq('id', params.pedidoId.trim())
        .maybeSingle();
      const rawCid = (pedRow as { cliente_id?: string | null } | null)?.cliente_id;
      clienteIdParaLata = rawCid && String(rawCid).trim() ? String(rawCid).trim() : null;
    }

    const assadeiraOk = await validarAssadeiraIdParaProduto(
      supabase,
      params.produtoId,
      params.assadeiraId,
      clienteIdParaLata,
    );
    if (!assadeiraOk.ok) {
      return { success: false as const, error: assadeiraOk.error };
    }

    const { data, error } = await supabase
      .from('ordens_producao')
      .insert({
        produto_id: params.produtoId,
        qtd_planejada: params.qtdPlanejada,
        pedido_id: params.pedidoId,
        prioridade: params.prioridade || 0,
        lote_codigo: loteCodigo,
        status: 'planejado',
        data_producao: dataProducao,
        ordem_planejamento: nextOrdemPlanejamento,
        assadeira_id: assadeiraOk.value,
        temporaria: false,
        temporaria_expira_em: null,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/producao/fila');
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao criar OP:', error);
    return { success: false, error: 'Erro ao criar ordem de produção' };
  }
}

export async function updateProductionOrder(params: UpdateProductionOrderParams) {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  try {
    const updateData: Record<string, unknown> = {
      produto_id: params.produtoId,
      qtd_planejada: params.qtdPlanejada,
      prioridade: params.prioridade ?? 0,
    };

    if (params.dataProducao) {
      updateData.data_producao = new Date(params.dataProducao).toISOString();
    }

    let clienteIdParaLata: string | null = null;
    const { data: ordemPed, error: ordemPedErr } = await supabase
      .from('ordens_producao')
      .select('pedido_id')
      .eq('id', params.ordemId)
      .maybeSingle();
    if (!ordemPedErr && ordemPed?.pedido_id) {
      const pid = String(ordemPed.pedido_id).trim();
      if (pid) {
        const { data: pedRow } = await supabase
          .from('pedidos')
          .select('cliente_id')
          .eq('id', pid)
          .maybeSingle();
        const rawCid = (pedRow as { cliente_id?: string | null } | null)?.cliente_id;
        clienteIdParaLata = rawCid && String(rawCid).trim() ? String(rawCid).trim() : null;
      }
    }

    const assadeiraOk = await validarAssadeiraIdParaProduto(
      supabase,
      params.produtoId,
      params.assadeiraId,
      clienteIdParaLata,
    );
    if (!assadeiraOk.ok) {
      return { success: false as const, error: assadeiraOk.error };
    }
    updateData.assadeira_id = assadeiraOk.value;

    const { data, error } = await supabase
      .from('ordens_producao')
      .update(updateData)
      .eq('id', params.ordemId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/producao/fila');
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao atualizar OP:', error);
    return { success: false, error: 'Erro ao atualizar ordem de produção' };
  }
}

function messageForCancelOrderFailure(error: unknown): string {
  const e = error as { code?: string; message?: string; details?: string };
  const combined = `${e?.message ?? ''} ${e?.details ?? ''}`;

  if (
    e?.code === '23514' ||
    /violates check constraint|check constraint/i.test(combined)
  ) {
    return (
      'A base de dados não aceita o status «cancelado» nesta tabela. ' +
      'Inclua «cancelado» na constraint CHECK de ordens_producao.status ' +
      '(no Supabase: SQL Editor — ver ficheiro FIX_ORDENS_PRODUCAO_STATUS_CANCELADO.sql no projeto).'
    );
  }

  if (typeof e?.message === 'string' && e.message.length > 0 && e.message.length < 240) {
    return `Não foi possível excluir a ordem: ${e.message}`;
  }

  return 'Não foi possível excluir a ordem. Tente novamente.';
}

/**
 * Remove a ordem da fila (planejamento): marca como cancelada.
 * Só permitido enquanto o status for `planejado` (nada iniciado na produção).
 */
export async function cancelProductionOrder(ordemId: string) {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  try {
    const { data: row, error: fetchError } = await supabase
      .from('ordens_producao')
      .select('id, status')
      .eq('id', ordemId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!row) {
      return { success: false as const, error: 'Ordem não encontrada.' };
    }

    const st = row.status ?? 'planejado';
    if (st !== 'planejado') {
      return {
        success: false as const,
        error:
          'Só é possível excluir ordens ainda em planejamento (sem produção iniciada).',
      };
    }

    const statusIsNull = row.status == null;
    const updateQuery = supabase
      .from('ordens_producao')
      .update({ status: 'cancelado' })
      .eq('id', ordemId)
      .select('id');

    const { data: updatedRows, error: updateError } = statusIsNull
      ? await updateQuery.is('status', null)
      : await updateQuery.eq('status', 'planejado');

    if (updateError) throw updateError;
    if (!updatedRows?.length) {
      return {
        success: false as const,
        error:
          'Esta ordem já não está em planejamento ou foi alterada por outro usuário.',
      };
    }

    revalidatePath('/producao/fila');
    return { success: true as const };
  } catch (error) {
    console.error('Erro ao cancelar OP:', serializeSupabaseError(error));
    return {
      success: false as const,
      error: messageForCancelOrderFailure(error),
    };
  }
}

function serializeSupabaseError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    const anyErr = err as Error & {
      code?: string;
      details?: string;
      hint?: string;
      status?: number | string;
    };
    let ownKeysJson: string | undefined;
    try {
      ownKeysJson = JSON.stringify(err, Object.getOwnPropertyNames(err));
    } catch {
      ownKeysJson = undefined;
    }
    return {
      name: err.name,
      message: err.message,
      code: anyErr.code,
      details: anyErr.details,
      hint: anyErr.hint,
      status: anyErr.status,
      ownKeysJson,
    };
  }
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>;
    const out: Record<string, unknown> = {
      message: e.message,
      code: e.code,
      details: e.details,
      hint: e.hint,
      status: e.status,
    };
    const nested = e.error;
    if (nested && typeof nested === 'object') {
      const n = nested as Record<string, unknown>;
      out.nestedMessage = n.message;
      out.nestedCode = n.code;
    }
    const hasText = Object.values(out).some((v) => v != null && String(v).trim() !== '');
    if (!hasText) {
      try {
        out.serialized = JSON.stringify(err, Object.getOwnPropertyNames(err));
      } catch {
        try {
          out.serialized = JSON.stringify(err);
        } catch {
          out.serialized = '[object]';
        }
      }
    }
    return out;
  }
  return { raw: String(err) };
}

/** BD sem colunas `unidades_lata_antiga` / `unidades_lata_nova` em `produtos` (migração opcional não aplicada). */
function isProdutosUnidadesLataColumnsMissing(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  const msg = String((err as { message?: string })?.message ?? '').toLowerCase();
  return (
    code === '42703' &&
    (msg.includes('unidades_lata_antiga') || msg.includes('unidades_lata_nova'))
  );
}

/** Coluna inexistente ou schema cache — tentar SELECT mais enxuto. */
function isProdutosSelectColumnError(err: unknown): boolean {
  if (isProdutosUnidadesLataColumnsMissing(err)) return true;
  const code = String((err as { code?: string })?.code ?? '');
  const msg = String((err as { message?: string })?.message ?? '').toLowerCase();
  return (
    code === '42703' ||
    (msg.includes('column') && msg.includes('does not exist')) ||
    msg.includes('schema cache') ||
    msg.includes('could not find')
  );
}

function normalizeProdutoIdKey(id: string | null | undefined): string {
  return String(id ?? '').trim().toLowerCase();
}

const PRODUTO_FILA_SELECT_VARIANTS = [
  'id, nome, unidade_padrao_id, package_units, box_units, unidades_assadeira, unidades_lata_antiga, unidades_lata_nova',
  'id, nome, unidade_padrao_id, package_units, box_units, unidades_assadeira',
  'id, nome, unidade_padrao_id, unidades_assadeira',
  'id, nome',
] as const;

const PRODUTO_FILA_IN_CHUNK_SIZE = 80;

type ProdutoJoinRowFila = {
  nome: string;
  unidade_padrao_id?: string | null;
  package_units?: number | null;
  box_units?: number | null;
  unidades_assadeira?: number | null;
  unidades_lata_antiga?: number | null;
  unidades_lata_nova?: number | null;
  unidades?: { nome_resumido?: string } | null;
};

async function loadProdutosJoinMapForFila(
  supabase: ReturnType<typeof supabaseClientFactory.createServiceRoleClient>,
  produtoIds: string[],
): Promise<{ map: Map<string, ProdutoJoinRowFila>; leituraFalhou: boolean }> {
  const map = new Map<string, ProdutoJoinRowFila>();
  const ids = [...new Set(produtoIds.map(normalizeProdutoIdKey).filter(Boolean))];
  if (ids.length === 0) return { map, leituraFalhou: false };

  let leituraFalhou = false;

  for (let offset = 0; offset < ids.length; offset += PRODUTO_FILA_IN_CHUNK_SIZE) {
    const chunk = ids.slice(offset, offset + PRODUTO_FILA_IN_CHUNK_SIZE);
    let pRows: Record<string, unknown>[] | null = null;
    let lastErr: unknown = null;

    for (const select of PRODUTO_FILA_SELECT_VARIANTS) {
      const { data, error } = await supabase.from('produtos').select(select).in('id', chunk);
      if (!error) {
        pRows = (data ?? []) as unknown as Record<string, unknown>[];
        lastErr = null;
        break;
      }
      lastErr = error;
      if (!isProdutosSelectColumnError(error)) break;
    }

    if (lastErr) {
      leituraFalhou = true;
      console.error(
        'Erro ao buscar fila (produtos):',
        JSON.stringify(serializeSupabaseError(lastErr as unknown)),
      );
      continue;
    }

    const uid = [
      ...new Set(
        (pRows ?? [])
          .map((r) => String(r.unidade_padrao_id ?? '').trim())
          .filter(Boolean),
      ),
    ];
    const unNome = new Map<string, string>();
    if (uid.length > 0) {
      const { data: uRows, error: uErr } = await supabase
        .from('unidades')
        .select('id, nome_resumido')
        .in('id', uid);
      if (!uErr && uRows) {
        for (const u of uRows as { id: string; nome_resumido?: string | null }[]) {
          unNome.set(u.id, (u.nome_resumido ?? '').trim());
        }
      }
    }

    for (const pr of pRows ?? []) {
      const id = normalizeProdutoIdKey(String(pr.id ?? ''));
      if (!id) continue;
      const up = String(pr.unidade_padrao_id ?? '').trim() || null;
      const nr = up ? unNome.get(up) : undefined;
      map.set(id, {
        nome: String(pr.nome ?? '').trim() || '—',
        unidade_padrao_id: up,
        package_units: (pr.package_units as number | null | undefined) ?? null,
        box_units: (pr.box_units as number | null | undefined) ?? null,
        unidades_assadeira: (pr.unidades_assadeira as number | null | undefined) ?? null,
        unidades_lata_antiga: (pr.unidades_lata_antiga as number | null | undefined) ?? null,
        unidades_lata_nova: (pr.unidades_lata_nova as number | null | undefined) ?? null,
        unidades: nr != null && nr !== '' ? { nome_resumido: nr } : { nome_resumido: '' },
      });
    }
  }

  return { map, leituraFalhou };
}

function formatEstoqueResumoTexto(q: Quantidade): string {
  const parts: string[] = [];
  if (q.caixas) parts.push(`${formatIntegerWithThousands(q.caixas)} cx`);
  if (q.pacotes) parts.push(`${formatIntegerWithThousands(q.pacotes)} pct`);
  if (q.unidades) parts.push(`${formatIntegerWithThousands(q.unidades)} un`);
  if (q.kg) parts.push(`${formatNumberWithThousands(q.kg, { decimals: 2 })} kg`);
  return parts.length > 0 ? parts.join(' · ') : '0';
}

type LataLinkRow = { assadeira_id: string; unidades: number; nome: string; ordem: number };

/**
 * Nome da assadeira (cadastro de latas) que corresponde ao pedido/produto:
 * cliente só lata antiga → casa com `unidades_lata_antiga`; senão com `unidades_assadeira` (primária no produto).
 * Respeita `assadeirasBloqueadasParaCliente`: latas nessa lista são ignoradas (exclusão no cadastro).
 */
function nomeLataTipoParaOrdem(
  produtoId: string,
  produto: {
    unidades_assadeira?: number | null;
    unidades_lata_antiga?: number | null;
    unidades_lata_nova?: number | null;
  } | null | undefined,
  somenteLataAntigaCliente: boolean,
  linksByProduto: Map<string, LataLinkRow[]>,
  assadeirasBloqueadasParaCliente: Set<string>,
): string | null {
  if (!produto || !produtoId) return null;
  const raw = linksByProduto.get(produtoId);
  if (!raw?.length) return null;
  const links = [...raw]
    .filter((l) => !assadeirasBloqueadasParaCliente.has(l.assadeira_id))
    .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
  if (!links.length) return null;

  const matchUnidades = (u: number | null | undefined): string | null => {
    if (u == null || !Number.isFinite(Number(u)) || Number(u) <= 0) return null;
    const n = Math.round(Number(u));
    const hit = links.find((l) => l.unidades === n);
    return hit?.nome ?? null;
  };

  if (somenteLataAntigaCliente) {
    const fromAntiga = matchUnidades(produto.unidades_lata_antiga ?? produto.unidades_assadeira);
    if (fromAntiga) return fromAntiga;
  }

  const fromPrimary = matchUnidades(produto.unidades_assadeira);
  if (fromPrimary) return fromPrimary;

  const fromNova = matchUnidades(produto.unidades_lata_nova);
  if (fromNova) return fromNova;

  return links[0]?.nome ?? null;
}

export async function getProductionQueue() {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  // Sem embed por hint de FK: no schema `interno` o nome da constraint pode não coincidir com o gerado
  // (PGRST200). Buscamos ordens, produtos e pedidos/clientes em consultas separadas e montamos o mesmo formato.
  // Inclui `concluido`: ordens com saída de embalagem gravada precisam continuar na fila para editar/excluir lançamentos.
  const { data: ordensRows, error } = await supabase
    .from('ordens_producao')
    .select('*')
    .neq('status', 'cancelado');

  if (error) {
    console.error(
      'Erro ao buscar fila (ordens_producao):',
      JSON.stringify(serializeSupabaseError(error as unknown)),
    );
    return [];
  }

  if (!ordensRows || ordensRows.length === 0) {
    return [];
  }

  type OrdemRowIn = Record<string, unknown> & { id: string; produto_id: string; pedido_id?: string | null };
  const ordensTyped = ordensRows as OrdemRowIn[];

  const ordemProdutoIds = [
    ...new Set(
      ordensTyped.map((r) => normalizeProdutoIdKey(String(r.produto_id ?? ''))).filter(Boolean),
    ),
  ];
  const pedidoIds = [
    ...new Set(
      ordensTyped
        .map((r) => r.pedido_id)
        .filter((id): id is string => Boolean(id && String(id).trim())),
    ),
  ];

  const { map: produtosJoin, leituraFalhou: produtosFilaLeituraFalhou } =
    await loadProdutosJoinMapForFila(supabase, ordemProdutoIds);

  const pedidosJoin = new Map<
    string,
    { cliente_id?: string | null; clientes?: { nome_fantasia?: string | null } | null }
  >();
  if (pedidoIds.length > 0) {
    const { data: pedRows, error: pedErr } = await supabase
      .from('pedidos')
      .select('id, cliente_id')
      .in('id', pedidoIds);
    if (pedErr) {
      console.error(
        'Erro ao buscar fila (pedidos):',
        JSON.stringify(serializeSupabaseError(pedErr as unknown)),
      );
    } else {
      const cids = [
        ...new Set(
          (pedRows ?? [])
            .map((r) => (r as { cliente_id?: string | null }).cliente_id)
            .filter((id): id is string => Boolean(id && String(id).trim())),
        ),
      ];
      const clienteNome = new Map<string, string>();
      if (cids.length > 0) {
        const { data: cRows, error: cErr } = await supabase
          .from('clientes')
          .select('id, nome_fantasia')
          .in('id', cids);
        if (!cErr && cRows) {
          for (const c of cRows as { id: string; nome_fantasia?: string | null }[]) {
            clienteNome.set(c.id, (c.nome_fantasia ?? '').trim());
          }
        }
      }
      for (const p of (pedRows ?? []) as { id: string; cliente_id?: string | null }[]) {
        const cid = p.cliente_id?.trim();
        pedidosJoin.set(p.id, {
          cliente_id: cid ?? null,
          clientes:
            cid != null && clienteNome.has(cid)
              ? { nome_fantasia: clienteNome.get(cid) ?? null }
              : null,
        });
      }
    }
  }

  type OrdemProducaoItem = {
    id: string;
    produto_id: string;
    lote_codigo: string;
    qtd_planejada: number;
    [key: string]: unknown;
  };

  const data = ordensTyped.map((row) => {
    const pid = normalizeProdutoIdKey(String(row.produto_id ?? ''));
    const pedId =
      row.pedido_id != null && String(row.pedido_id).trim() !== ''
        ? String(row.pedido_id).trim()
        : null;
    return {
      ...row,
      produtos: pid ? produtosJoin.get(pid) ?? null : null,
      produtos_fila_leitura_falhou: produtosFilaLeituraFalhou,
      pedidos: pedId ? pedidosJoin.get(pedId) ?? { cliente_id: null, clientes: null } : null,
    };
  }) as unknown as OrdemProducaoItem[];

  // Buscar receitas de massa para todos os produtos
  const produtoIds = [...new Set(data.map((item: OrdemProducaoItem) => item.produto_id))];

  const clienteIds = [
    ...new Set(
      (data as { pedidos?: { cliente_id?: string | null } | null }[])
        .map((i) => i.pedidos?.cliente_id)
        .filter((id): id is string => Boolean(id && String(id).trim())),
    ),
  ];

  /** Colunas opcionais (migração): leitura isolada para não quebrar o embed principal. */
  const somenteLataAntigaPorCliente = new Map<string, boolean>();
  if (clienteIds.length > 0) {
    const { data: cliRows, error: cliErr } = await supabase
      .from('clientes')
      .select('id, somente_lata_antiga')
      .in('id', clienteIds);
    if (cliErr) {
      console.warn(
        '[fila] clientes.somente_lata_antiga:',
        JSON.stringify(serializeSupabaseError(cliErr)),
      );
    } else {
      for (const row of cliRows ?? []) {
        const r = row as { id: string; somente_lata_antiga?: boolean | null };
        somenteLataAntigaPorCliente.set(r.id, Boolean(r.somente_lata_antiga));
      }
    }
  }

  const unidadesLataPorProduto = new Map<string, { antiga: number | null; nova: number | null }>();
  if (produtoIds.length > 0) {
    const { data: plRows, error: plErr } = await supabase
      .from('produtos')
      .select('id, unidades_lata_antiga, unidades_lata_nova')
      .in('id', produtoIds);
    if (plErr && !isProdutosUnidadesLataColumnsMissing(plErr)) {
      console.warn(
        '[fila] produtos.unidades_lata_*:',
        JSON.stringify(serializeSupabaseError(plErr)),
      );
    } else if (!plErr) {
      for (const row of plRows ?? []) {
        const r = row as {
          id: string;
          unidades_lata_antiga?: number | null;
          unidades_lata_nova?: number | null;
        };
        unidadesLataPorProduto.set(r.id, {
          antiga: r.unidades_lata_antiga ?? null,
          nova: r.unidades_lata_nova ?? null,
        });
      }
    }
  }

  let receitasVinculadas: ProdutoReceitaMassaLinkRow[] | null = null;
  if (produtoIds.length > 0) {
    // Sem embed: o hint `receitas!produto_receitas_receita_id_fkey` pode falhar (PGRST200) se o nome da FK no schema divergir.
    const { rows: receitasRows, error: receitasError } = await loadProdutoReceitasMassaLinkRows(
      supabase,
      produtoIds,
    );

    if (receitasError) {
      console.error(
        'Erro ao buscar receitas vinculadas:',
        JSON.stringify(serializeSupabaseError(receitasError)),
      );
    } else {
      receitasVinculadas = receitasRows;
    }
  }

  const bloqueiosPorCliente = new Map<string, Set<string>>();
  if (clienteIds.length > 0) {
    const { data: bioRows, error: bioErr } = await supabase
      .from('cliente_assadeira_bloqueios')
      .select('cliente_id, assadeira_id')
      .in('cliente_id', clienteIds);
    if (bioErr) {
      console.warn(
        '[fila] cliente_assadeira_bloqueios:',
        JSON.stringify(serializeSupabaseError(bioErr)),
      );
    } else {
      for (const row of (bioRows ?? []) as { cliente_id: string; assadeira_id: string }[]) {
        const cid = String(row.cliente_id);
        const s = bloqueiosPorCliente.get(cid) ?? new Set<string>();
        s.add(String(row.assadeira_id));
        bloqueiosPorCliente.set(cid, s);
      }
    }
  }

  const linksByProduto = new Map<string, LataLinkRow[]>();
  if (produtoIds.length > 0) {
    const { data: paData, error: paError } = await supabase
      .from('produto_assadeiras')
      .select('produto_id, assadeira_id, unidades_por_assadeira')
      .in('produto_id', produtoIds);

    if (paError) {
      console.error(
        'Erro ao buscar latas por produto (fila):',
        JSON.stringify(serializeSupabaseError(paError)),
      );
    } else {
      const aidSet = new Set<string>();
      for (const row of paData ?? []) {
        const aid = String((row as { assadeira_id?: string }).assadeira_id ?? '').trim();
        if (aid) aidSet.add(aid);
      }
      const aids = [...aidSet];
      const assMeta = new Map<string, { nome: string; ordem: number }>();
      if (aids.length > 0) {
        const { data: assRows, error: assQueryErr } = await supabase
          .from('assadeiras')
          .select('id, nome, ordem')
          .in('id', aids);
        if (assQueryErr) {
          console.error(
            'Erro ao buscar nomes de latas (fila):',
            JSON.stringify(serializeSupabaseError(assQueryErr)),
          );
        } else {
          for (const a of assRows ?? []) {
            const r = a as { id: string; nome?: string | null; ordem?: number | null };
            assMeta.set(r.id, { nome: (r.nome ?? '').trim(), ordem: r.ordem ?? 0 });
          }
        }
      }

      for (const row of paData ?? []) {
        const r = row as {
          produto_id: string;
          assadeira_id?: string;
          unidades_por_assadeira?: number | string | null;
        };
        const aid = String(r.assadeira_id ?? '').trim();
        const meta = assMeta.get(aid);
        const nome = meta?.nome?.trim();
        if (!aid || !meta || !nome) continue;
        const ordem = meta.ordem ?? 0;
        const u = Math.round(Number(r.unidades_por_assadeira));
        if (!Number.isFinite(u) || u <= 0) continue;
        const list = linksByProduto.get(r.produto_id) ?? [];
        list.push({ assadeira_id: aid, unidades: u, nome, ordem });
        linksByProduto.set(r.produto_id, list);
      }
    }
  }

  // Criar mapa de produto_id -> receita_massa (filtrar apenas tipo massa e receita ativa)
  const receitasMap = new Map<string, { quantidade_por_produto: number }>();
  receitasVinculadas?.forEach((pr: ProdutoReceitaMassaLinkRow) => {
    if (isVinculoReceitaMassaAtiva(pr)) {
      receitasMap.set(pr.produto_id, {
        quantidade_por_produto: pr.quantidade_por_produto,
      });
    }
  });

  // Buscar lotes de massa para calcular receitas batidas (apenas para estação massa)
  // Agora os dados estão diretamente em producao_etapas_log
  const { data: massaLogs } = await supabase
    .from('producao_etapas_log')
    .select(`
      id,
      ordem_producao_id,
      receitas_batidas,
      receita_id
    `)
    .eq('etapa', 'massa')
    .in('ordem_producao_id', data.map((item: OrdemProducaoItem) => item.id));

  // Criar mapa de ordem_producao_id -> total de receitas batidas (só logs com lote gravado: receita_id preenchido)
  type MassaLogItem = {
    ordem_producao_id: string;
    receitas_batidas: number | null;
    receita_id: string | null;
  };
  const receitasBatidasMap = new Map<string, number>();
  if (massaLogs && Array.isArray(massaLogs)) {
    (massaLogs as unknown as MassaLogItem[]).forEach((log) => {
      if (log.receita_id == null || String(log.receita_id).trim() === '') {
        return;
      }
      const currentTotal = receitasBatidasMap.get(log.ordem_producao_id) || 0;
      const receitas = log.receitas_batidas || 0;
      receitasBatidasMap.set(log.ordem_producao_id, currentTotal + receitas);
    });
  }

  // Massa "disponível para fermentação": soma das receitas batidas em todos os lotes (logs etapa massa).
  // Não exige log de massa com fim preenchido — na prática os lotes são gravados com a etapa ainda aberta.
  // Usa o mesmo agregado que receitasBatidasMap (abaixo na transformação).

  type OrdemProducaoWithProduto = OrdemProducaoItem & {
    produtos?: {
      nome?: string;
      package_units?: number | null;
      box_units?: number | null;
      unidades_assadeira?: number | null;
      unidades?: { nome_resumido?: string } | null;
      [key: string]: unknown;
    } | null;
    pedidos?: {
      cliente_id?: string | null;
      clientes?: { nome_fantasia?: string | null } | null;
    } | null;
  };

  const orderIds = data.map((item: OrdemProducaoItem) => item.id);

  const { data: fermentacaoLogsAll } = await supabase
    .from('producao_etapas_log')
    .select('id, ordem_producao_id, qtd_saida, dados_qualidade, fim, inicio')
    .eq('etapa', 'fermentacao')
    .in('ordem_producao_id', orderIds);

  const { data: fornoLogsComQualidade } = await supabase
    .from('producao_etapas_log')
    .select('ordem_producao_id, dados_qualidade')
    .eq('etapa', 'entrada_forno')
    .in('ordem_producao_id', orderIds);

  type FornoEntradaRow = {
    id: string;
    ordem_producao_id: string;
    inicio: string | null;
    fim: string | null;
    dados_qualidade: unknown;
    qtd_saida: number | null;
  };
  const { data: fornoLogsTodasEntradas } = await supabase
    .from('producao_etapas_log')
    .select('id, ordem_producao_id, inicio, fim, dados_qualidade, qtd_saida')
    .eq('etapa', 'entrada_forno')
    .in('ordem_producao_id', orderIds);

  const fornoLogsByOrdem = new Map<string, FornoEntradaRow[]>();
  for (const row of (fornoLogsTodasEntradas ?? []) as FornoEntradaRow[]) {
    const list = fornoLogsByOrdem.get(row.ordem_producao_id) ?? [];
    list.push(row);
    fornoLogsByOrdem.set(row.ordem_producao_id, list);
  }

  type SaidaFornoLogRow = {
    id: string;
    ordem_producao_id: string;
    inicio: string | null;
    fim: string | null;
    dados_qualidade: unknown;
    qtd_saida: number | null;
  };
  const { data: saidaFornoLogsTodas } = await supabase
    .from('producao_etapas_log')
    .select('id, ordem_producao_id, inicio, fim, dados_qualidade, qtd_saida')
    .eq('etapa', 'saida_forno')
    .in('ordem_producao_id', orderIds);

  const saidaFornoLogsByOrdem = new Map<string, SaidaFornoLogRow[]>();
  for (const row of (saidaFornoLogsTodas ?? []) as SaidaFornoLogRow[]) {
    const list = saidaFornoLogsByOrdem.get(row.ordem_producao_id) ?? [];
    list.push(row);
    saidaFornoLogsByOrdem.set(row.ordem_producao_id, list);
  }

  const saidaBandejasByOrdem = new Map<string, number>();
  for (const row of saidaFornoLogsTodas ?? []) {
    if ((row as SaidaFornoLogRow).fim == null) continue;
    const b = bandejasFromSaidaFornoLog((row as SaidaFornoLogRow).dados_qualidade);
    if (b <= 0) continue;
    const oid = row.ordem_producao_id as string;
    saidaBandejasByOrdem.set(oid, (saidaBandejasByOrdem.get(oid) || 0) + b);
  }

  type EmbalagemLogRow = {
    id: string;
    ordem_producao_id: string;
    inicio: string | null;
    fim: string | null;
    dados_qualidade: unknown;
    qtd_saida: number | null;
  };
  const { data: entradaEmbalagemLogsTodas } = await supabase
    .from('producao_etapas_log')
    .select('id, ordem_producao_id, inicio, fim, dados_qualidade, qtd_saida')
    .eq('etapa', 'entrada_embalagem')
    .in('ordem_producao_id', orderIds);

  const entradaEmbalagemLogsByOrdem = new Map<string, EmbalagemLogRow[]>();
  for (const row of (entradaEmbalagemLogsTodas ?? []) as EmbalagemLogRow[]) {
    const list = entradaEmbalagemLogsByOrdem.get(row.ordem_producao_id) ?? [];
    list.push(row);
    entradaEmbalagemLogsByOrdem.set(row.ordem_producao_id, list);
  }

  const saidaCarrinhoByLogId = new Map<string, string>();
  for (const row of (saidaFornoLogsTodas ?? []) as SaidaFornoLogRow[]) {
    const dq = row.dados_qualidade as { numero_carrinho?: string } | null | undefined;
    saidaCarrinhoByLogId.set(row.id, dq?.numero_carrinho?.trim() || '—');
  }

  const entradaEmbalagemLatasByOrdem = new Map<string, number>();
  /** Um registro concluído na entrada da embalagem = um lote/carrinho contabilizado na fila. */
  const entradaEmbalagemRegistrosByOrdem = new Map<string, number>();
  const saidaFornoLogIdsNaEmbalagem = new Set<string>();
  for (const row of entradaEmbalagemLogsTodas ?? []) {
    const emb = row as EmbalagemLogRow;
    if (emb.fim == null) continue;
    const oid = emb.ordem_producao_id;
    entradaEmbalagemRegistrosByOrdem.set(oid, (entradaEmbalagemRegistrosByOrdem.get(oid) || 0) + 1);
    const sid = (emb.dados_qualidade as { saida_forno_log_id?: string } | null)?.saida_forno_log_id;
    if (sid?.trim()) saidaFornoLogIdsNaEmbalagem.add(sid.trim());
    const latas = latasFromEntradaEmbalagemLog(emb.dados_qualidade, emb.qtd_saida);
    if (latas <= 0) continue;
    entradaEmbalagemLatasByOrdem.set(oid, (entradaEmbalagemLatasByOrdem.get(oid) || 0) + latas);
  }

  type SaidaEmbLogRow = {
    id: string;
    ordem_producao_id: string;
    inicio: string | null;
    fim: string | null;
    dados_qualidade: unknown;
    qtd_saida: number | null;
  };
  const { data: saidaEmbalagemLogs } = await supabase
    .from('producao_etapas_log')
    .select('id, ordem_producao_id, inicio, fim, dados_qualidade, qtd_saida')
    .eq('etapa', 'saida_embalagem')
    .in('ordem_producao_id', orderIds);

  const saidaEmbalagemLogsByOrdem = new Map<string, SaidaEmbLogRow[]>();
  for (const row of (saidaEmbalagemLogs ?? []) as SaidaEmbLogRow[]) {
    const list = saidaEmbalagemLogsByOrdem.get(row.ordem_producao_id) ?? [];
    list.push(row);
    saidaEmbalagemLogsByOrdem.set(row.ordem_producao_id, list);
  }

  const saidaEmbalagemCaixasPorOrdem = new Map<string, number>();
  for (const [oid, logsOrdem] of saidaEmbalagemLogsByOrdem) {
    let soma = 0;
    for (const log of logsOrdem) {
      const dq = log.dados_qualidade as { caixas_recebidas?: number } | null;
      const cr = dq?.caixas_recebidas;
      if (cr == null || !Number.isFinite(Number(cr))) continue;
      soma += Math.round(Number(cr));
    }
    if (soma > 0) saidaEmbalagemCaixasPorOrdem.set(oid, soma);
  }

  const receitasFermentacaoMap = new Map<string, number>();
  type FermentacaoLogRow = {
    id: string;
    ordem_producao_id: string;
    qtd_saida: number | null;
    dados_qualidade: unknown;
    fim: string | null;
  };
  for (const log of (fermentacaoLogsAll ?? []) as FermentacaoLogRow[]) {
    if (log.fim == null) continue;
    const ordemId = log.ordem_producao_id;
    const row = data.find((i: OrdemProducaoItem) => i.id === ordemId) as OrdemProducaoWithProduto | undefined;
    if (row && log.qtd_saida != null && !Number.isNaN(Number(log.qtd_saida))) {
      const receitaMassa = receitasMap.get(row.produto_id);
      if (receitaMassa && receitaMassa.quantidade_por_produto > 0) {
        const rec = Number(log.qtd_saida) / receitaMassa.quantidade_por_produto;
        receitasFermentacaoMap.set(ordemId, (receitasFermentacaoMap.get(ordemId) || 0) + rec);
      }
    }
  }

  const { data: fornoLogs } = await supabase
    .from('producao_etapas_log')
    .select('ordem_producao_id, qtd_saida')
    .eq('etapa', 'entrada_forno')
    .not('fim', 'is', null)
    .in('ordem_producao_id', orderIds);

  const fornoVolumeMap = new Map<string, number>();
  fornoLogs?.forEach(
    (log: { ordem_producao_id: string; qtd_saida: number | null }) => {
      const ordemId = log.ordem_producao_id;
      const row = data.find((i: OrdemProducaoItem) => i.id === ordemId) as OrdemProducaoWithProduto | undefined;
      const uaNum =
        row?.produtos?.unidades_assadeira != null && Number(row.produtos.unidades_assadeira) > 0
          ? Number(row.produtos.unidades_assadeira)
          : null;
      let volume = 0;
      if (uaNum != null && log.qtd_saida != null && !Number.isNaN(Number(log.qtd_saida))) {
        volume = Number(log.qtd_saida) / uaNum;
      } else if (log.qtd_saida != null && !Number.isNaN(Number(log.qtd_saida))) {
        volume = Number(log.qtd_saida);
      }
      fornoVolumeMap.set(ordemId, (fornoVolumeMap.get(ordemId) || 0) + volume);
    },
  );

  const estoquePorClienteProduto = new Map<string, EstoqueRecord>();
  if (isGoogleServiceAccountConfigured()) {
    try {
      const todosEstoques = await estoqueService.obterTodosEstoques();
      for (const r of todosEstoques) {
        const k = `${String(r.cliente).trim().toLowerCase()}|${String(r.produto).trim().toLowerCase()}`;
        estoquePorClienteProduto.set(k, r);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(serializeSupabaseError(e));
      console.error('Resumo de estoque indisponível ao montar a fila:', msg);
    }
  }

  const assadeiraIdsDasOrdens = [
    ...new Set(
      (data as { assadeira_id?: string | null }[])
        .map((r) => r.assadeira_id?.trim())
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const nomeAssadeiraPorId = new Map<string, string>();
  const buracosPorAssadeiraId = new Map<string, number>();
  if (assadeiraIdsDasOrdens.length > 0) {
    const { data: anRows, error: anErr } = await supabase
      .from('assadeiras')
      .select('id, nome, numero_buracos')
      .in('id', assadeiraIdsDasOrdens);
    if (anErr) {
      console.warn(
        '[fila] assadeiras (nome na OP):',
        JSON.stringify(serializeSupabaseError(anErr)),
      );
    } else {
      for (const r of anRows ?? []) {
        const row = r as { id: string; nome: string; numero_buracos?: number };
        nomeAssadeiraPorId.set(row.id, (row.nome ?? '').trim() || '—');
        const br = Math.round(Number(row.numero_buracos ?? 0));
        if (br > 0) buracosPorAssadeiraId.set(row.id, br);
      }
    }
  }

  const unidadesPorAssadeiraCadPorChave = new Map<string, number>();
  const paresProdutoAssadeira = [
    ...new Set(
      (data as { produto_id: string; assadeira_id?: string | null }[])
        .map((r) => {
          const aid = r.assadeira_id?.trim();
          if (!aid) return '';
          return `${r.produto_id}|${aid}`;
        })
        .filter(Boolean),
    ),
  ];
  if (paresProdutoAssadeira.length > 0) {
    const produtoIdsPa = [...new Set(paresProdutoAssadeira.map((k) => k.split('|')[0]!))];
    const assadeiraIdsPa = [...new Set(paresProdutoAssadeira.map((k) => k.split('|')[1]!))];
    const { data: paRows, error: paErr } = await supabase
      .from('produto_assadeiras')
      .select('produto_id, assadeira_id, unidades_por_assadeira')
      .in('produto_id', produtoIdsPa)
      .in('assadeira_id', assadeiraIdsPa);
    if (paErr) {
      console.warn('[fila] produto_assadeiras:', JSON.stringify(serializeSupabaseError(paErr)));
    } else {
      for (const r of paRows ?? []) {
        const row = r as {
          produto_id: string;
          assadeira_id: string;
          unidades_por_assadeira?: number;
        };
        const ua = Math.round(Number(row.unidades_por_assadeira ?? 0));
        if (ua > 0) {
          unidadesPorAssadeiraCadPorChave.set(`${row.produto_id}|${row.assadeira_id}`, ua);
        }
      }
    }
  }

  const fermentacaoLogIdsNoForno = new Set<string>();
  for (const row of (fornoLogsComQualidade ?? []) as { dados_qualidade?: unknown }[]) {
    const dq = row.dados_qualidade as { fermentacao_log_id?: string } | null | undefined;
    const fid = String(dq?.fermentacao_log_id ?? '').trim();
    if (fid) fermentacaoLogIdsNoForno.add(fid);
  }

  const fermCarrinhoByLogId = new Map<string, string>();
  for (const log of (fermentacaoLogsAll ?? []) as FermentacaoLogRow[]) {
    const dq = log.dados_qualidade as { numero_carrinho?: string } | null | undefined;
    fermCarrinhoByLogId.set(log.id, dq?.numero_carrinho?.trim() || '—');
  }

  // Caixas planejadas (conversão feita na ordem diária, já considerando o tipo de caixa) por OP.
  // A fila usa isto como meta de caixas na saída de embalagem; o cálculo por box_units do produto
  // não conhece o tipo de caixa nem converte latas→unidades corretamente.
  const caixasPlanejadasPorOp = new Map<string, number>();
  // Observação de produção da ordem diária (ex.: «lavar a lata depois») por OP — destaque nos cards da fila.
  const observacaoProducaoPorOp = new Map<string, string>();
  // Observação de embalagem da ordem diária (ex.: «caixa lisa») por OP — destaque nos cards de embalagem.
  const observacaoEmbalagemPorOp = new Map<string, string>();
  {
    const opIds = ordensTyped.map((r) => String(r.id)).filter(Boolean);
    if (opIds.length > 0) {
      const { data: diariaItens, error: diariaErr } = await supabase
        .from('ordens_producao_diarias_itens')
        .select('ordens_producao_id, caixas_estimadas, observacao_producao, observacao, observacao_embalagem')
        .in('ordens_producao_id', opIds);
      if (diariaErr) {
        console.warn('getProductionQueue caixas_estimadas:', diariaErr.message);
      } else {
        for (const r of diariaItens ?? []) {
          const row = r as {
            ordens_producao_id?: string | null;
            caixas_estimadas?: number | null;
            observacao_producao?: string | null;
            observacao?: string | null;
            observacao_embalagem?: string | null;
          };
          const opId = String(row.ordens_producao_id ?? '').trim();
          if (!opId) continue;
          const cx = Number(row.caixas_estimadas);
          if (Number.isFinite(cx) && cx > 0) {
            caixasPlanejadasPorOp.set(opId, Math.round(cx));
          }
          if (!observacaoProducaoPorOp.has(opId)) {
            const obsPro = row.observacao_producao;
            const obsLegacy = row.observacao;
            const obs =
              obsPro != null && String(obsPro).trim() !== ''
                ? String(obsPro).trim()
                : obsLegacy != null && String(obsLegacy).trim() !== ''
                  ? String(obsLegacy).trim()
                  : '';
            if (obs) observacaoProducaoPorOp.set(opId, obs);
          }
          if (!observacaoEmbalagemPorOp.has(opId)) {
            const obsEmb = row.observacao_embalagem;
            if (obsEmb != null && String(obsEmb).trim() !== '') {
              observacaoEmbalagemPorOp.set(opId, String(obsEmb).trim());
            }
          }
        }
      }
    }
  }

  // Transformar os dados para incluir receita_massa, receitas_batidas e receitas_fermentacao no formato esperado
  const transformedData = (data as OrdemProducaoWithProduto[]).map((item) => {
    const produto = item.produtos;
    const receitaMassa = receitasMap.get(item.produto_id) || null;
    const receitasBatidas = receitasBatidasMap.get(item.id) || 0;
    const receitasFermentacao = receitasFermentacaoMap.get(item.id) || 0;
    const forno_volume_concluido = fornoVolumeMap.get(item.id) || 0;
    const qtdMassaFinalizada = receitasBatidas > 0 ? receitasBatidas : null;

    // Extrair nome_resumido do join com unidades
    const unidades = produto?.unidades as { nome_resumido?: string } | null;
    const unidadeNomeResumido = unidades?.nome_resumido || null;

    const pidNorm = normalizeProdutoIdKey(item.produto_id);
    const leituraFilaFalhou = Boolean(
      (item as { produtos_fila_leitura_falhou?: boolean }).produtos_fila_leitura_falhou,
    );
    const produtoCargaFilaErro = pidNorm !== '' && produto == null && leituraFilaFalhou;
    const produtoJoinFaltando =
      pidNorm === '' || (produto == null && !leituraFilaFalhou);

    const latExtra = unidadesLataPorProduto.get(item.produto_id);
    const uaAntiga =
      latExtra?.antiga != null && Number.isFinite(Number(latExtra.antiga)) && Number(latExtra.antiga) > 0
        ? Number(latExtra.antiga)
        : produto != null && typeof produto.unidades_lata_antiga === 'number'
          ? produto.unidades_lata_antiga
          : null;
    const uaNova =
      latExtra?.nova != null && Number.isFinite(Number(latExtra.nova)) && Number(latExtra.nova) > 0
        ? Number(latExtra.nova)
        : produto != null && typeof produto.unidades_lata_nova === 'number'
          ? produto.unidades_lata_nova
          : null;
    const uaAssadeira =
      produto != null && typeof produto.unidades_assadeira === 'number'
        ? produto.unidades_assadeira
        : null;

    const productInfo: ProductConversionInfo = {
      unidadeNomeResumido,
      package_units: produto?.package_units ?? null,
      box_units: produto?.box_units ?? null,
      unidades_assadeira: uaAssadeira,
      unidades_lata_antiga: uaAntiga ?? uaAssadeira,
      unidades_lata_nova: uaNova,
      receita_massa: receitaMassa ?? undefined,
    };

    const clienteNome =
      item.pedidos?.clientes?.nome_fantasia?.trim() ?? '';
    const nomeProduto = produto?.nome?.trim() ?? '';

    let estoque_resumo: string | null = null;
    let estoque_unidades_consumo = 0;

    if (clienteNome && nomeProduto && !produtoJoinFaltando) {
      const chaveEstoque = `${clienteNome.toLowerCase()}|${nomeProduto.toLowerCase()}`;
      const est = estoquePorClienteProduto.get(chaveEstoque);
      if (est) {
        estoque_unidades_consumo = quantidadeEstoqueParaUnidadesConsumo(est.quantidade, productInfo);
        estoque_resumo = formatEstoqueResumoTexto(est.quantidade);
      }
    }

    const opAssadeiraIdConsumo = (item as { assadeira_id?: string | null }).assadeira_id?.trim() ?? '';
    const opConsumoInput = {
      qtd_planejada: item.qtd_planejada,
      assadeira_id: opAssadeiraIdConsumo || null,
      numeroBuracosAssadeira: opAssadeiraIdConsumo
        ? buracosPorAssadeiraId.get(opAssadeiraIdConsumo)
        : undefined,
      unidadesPorAssadeiraCadastro: opAssadeiraIdConsumo
        ? unidadesPorAssadeiraCadPorChave.get(`${item.produto_id}|${opAssadeiraIdConsumo}`)
        : undefined,
    };
    const unidadesPorLataOp = unidadesPorLataResolvidaParaOp(opConsumoInput, productInfo);
    const unidadesAssadeiraEfetiva =
      unidadesPorLataOp ?? (produto?.unidades_assadeira != null ? Number(produto.unidades_assadeira) : null);
    const productInfoComLata: ProductConversionInfo = {
      ...productInfo,
      unidades_assadeira: unidadesAssadeiraEfetiva,
    };
    const planejado_unidades_consumo = planejadoUnidadesConsumoFromOp(
      opConsumoInput,
      productInfoComLata,
    );
    const necessidadeConsumo = planejado_unidades_consumo;
    const aProduzirConsumo = Math.max(0, necessidadeConsumo - estoque_unidades_consumo);
    const qtd_a_produzir_planejada = unidadesConsumoParaQuantidadePlanejada(
      aProduzirConsumo,
      productInfo,
    );

    const uaForDisp =
      unidadesAssadeiraEfetiva != null && unidadesAssadeiraEfetiva > 0
        ? unidadesAssadeiraEfetiva
        : null;

    type CarrinhoFerm = {
      log_id: string;
      carrinho: string;
      latas: number;
      bloqueado_no_forno: boolean;
      eh_registro_adiantado: boolean;
      rotulo_exibicao: string;
    };
    let fermentacao_volume_concluido = 0;
    const fermentacao_carrinhos: CarrinhoFerm[] = [];
    for (const log of (fermentacaoLogsAll ?? []) as FermentacaoLogRow[]) {
      if (log.ordem_producao_id !== item.id || log.fim == null) continue;
      const volume = ltFromFermentacaoLog(log.qtd_saida, log.dados_qualidade, uaForDisp);
      fermentacao_volume_concluido += volume;
      const dq = log.dados_qualidade as { numero_carrinho?: string } | null | undefined;
      const carRaw = dq?.numero_carrinho?.trim() || '—';
      const rotulo = camposRotuloRegistroFila('fermentacao', log.dados_qualidade, carRaw, {
        latas: volume,
      });
      fermentacao_carrinhos.push({
        log_id: log.id,
        carrinho: carRaw,
        latas: volume,
        bloqueado_no_forno: fermentacaoLogIdsNoForno.has(log.id),
        ...rotulo,
      });
    }

    const carrinhos_disponiveis_forno = listCarrinhosDisponiveisForOrdemFromSnapshots(
      item.id,
      uaForDisp,
      fermentacaoLogsAll ?? [],
      fornoLogsComQualidade ?? [],
    );

    const forno_entrada_latas_total = sumLatasFromFornoLogRows(
      fornoLogsByOrdem.get(item.id) ?? [],
      uaForDisp,
    );

    type EntradaFornoFila = {
      log_id: string;
      carrinho: string;
      latas: number;
      em_andamento: boolean;
      max_latas_fermentacao: number;
      eh_registro_adiantado: boolean;
      rotulo_exibicao: string;
    };
    const entrada_forno_entradas: EntradaFornoFila[] = [];
    for (const log of fornoLogsByOrdem.get(item.id) ?? []) {
      const dq = log.dados_qualidade as { fermentacao_log_id?: string } | null | undefined;
      const fermId = String(dq?.fermentacao_log_id ?? '').trim();
      const latas = ltFromFornoLogRow(log.qtd_saida, log.dados_qualidade, uaForDisp);
      const fermLog = fermId
        ? ((fermentacaoLogsAll ?? []) as FermentacaoLogRow[]).find((l) => l.id === fermId)
        : undefined;
      const max_latas_fermentacao = fermLog
        ? ltFromFermentacaoLog(fermLog.qtd_saida, fermLog.dados_qualidade, uaForDisp)
        : 0;
      const carRaw = fermId ? (fermCarrinhoByLogId.get(fermId) ?? '—') : '—';
      const rotulo = camposRotuloRegistroFila(
        'entrada_forno',
        log.dados_qualidade,
        carRaw,
        { latas },
        fermLog?.dados_qualidade,
      );
      entrada_forno_entradas.push({
        log_id: log.id,
        carrinho: carRaw,
        latas,
        em_andamento: log.fim == null,
        max_latas_fermentacao,
        ...rotulo,
      });
    }

    const saida_forno_bandejas_total = saidaBandejasByOrdem.get(item.id) || 0;

    type SaidaFornoFila = {
      log_id: string;
      carrinho: string;
      bandejas: number;
      em_andamento: boolean;
      bloqueado_na_embalagem: boolean;
      eh_registro_adiantado: boolean;
      rotulo_exibicao: string;
    };
    const saida_forno_registros: SaidaFornoFila[] = [];
    for (const log of saidaFornoLogsByOrdem.get(item.id) ?? []) {
      const dq = log.dados_qualidade as { numero_carrinho?: string } | null | undefined;
      const bandejas = bandejasFromSaidaFornoLog(log.dados_qualidade);
      const carRaw = dq?.numero_carrinho?.trim() || '—';
      const rotulo = camposRotuloRegistroFila('saida_forno', log.dados_qualidade, carRaw, {
        bandejas,
      });
      saida_forno_registros.push({
        log_id: log.id,
        carrinho: carRaw,
        bandejas,
        em_andamento: log.fim == null,
        bloqueado_na_embalagem: saidaFornoLogIdsNaEmbalagem.has(log.id),
        ...rotulo,
      });
    }

    const entrada_embalagem_latas_total = entradaEmbalagemLatasByOrdem.get(item.id) || 0;
    const entrada_embalagem_registros_count = entradaEmbalagemRegistrosByOrdem.get(item.id) || 0;

    const logsEmbalagemMax: ProductionStepLog[] = [];
    for (const s of saidaFornoLogsByOrdem.get(item.id) ?? []) {
      logsEmbalagemMax.push({
        id: s.id,
        ordem_producao_id: item.id,
        etapa: 'saida_forno',
        fim: s.fim,
        inicio: s.inicio ?? '',
        dados_qualidade: s.dados_qualidade,
        qtd_saida: s.qtd_saida,
      } as ProductionStepLog);
    }
    for (const e of entradaEmbalagemLogsByOrdem.get(item.id) ?? []) {
      logsEmbalagemMax.push({
        id: e.id,
        ordem_producao_id: item.id,
        etapa: 'entrada_embalagem',
        fim: e.fim,
        inicio: e.inicio ?? '',
        dados_qualidade: e.dados_qualidade,
        qtd_saida: e.qtd_saida,
      } as ProductionStepLog);
    }

    type EntradaEmbFila = {
      log_id: string;
      carrinho: string;
      latas: number;
      em_andamento: boolean;
      max_latas_disponivel: number;
      bloqueado: boolean;
      eh_registro_adiantado: boolean;
      rotulo_exibicao: string;
    };
    const entrada_embalagem_registros: EntradaEmbFila[] = [];
    for (const log of entradaEmbalagemLogsByOrdem.get(item.id) ?? []) {
      const dq = log.dados_qualidade as { saida_forno_log_id?: string; numero_carrinho?: string } | null;
      const saidaId = String(dq?.saida_forno_log_id ?? '').trim();
      const latas = latasFromEntradaEmbalagemLog(log.dados_qualidade, log.qtd_saida);
      const saidaLog = saidaId
        ? (saidaFornoLogsByOrdem.get(item.id) ?? []).find((s) => s.id === saidaId)
        : undefined;
      const dqS = saidaLog?.dados_qualidade as SaidaFornoQualityData | null | undefined;
      const bloqueado = dqS?.liberacao_carrinho_perda_total === true;
      const max_latas_disponivel =
        saidaId && !bloqueado
          ? maxLatasEditaveisEntradaEmbalagemLog(logsEmbalagemMax, log.id, saidaId, dqS)
          : 0;
      const carRaw =
        dq?.numero_carrinho?.trim() || (saidaId ? (saidaCarrinhoByLogId.get(saidaId) ?? '—') : '—');
      const rotulo = camposRotuloRegistroFila('entrada_embalagem', log.dados_qualidade, carRaw, {
        latas,
      });
      entrada_embalagem_registros.push({
        log_id: log.id,
        carrinho: carRaw,
        latas,
        em_andamento: log.fim == null,
        max_latas_disponivel,
        bloqueado,
        ...rotulo,
      });
    }
    type SaidaEmbFila = {
      log_id: string;
      caixas: number;
      em_andamento: boolean;
      registrado_em: string;
    };
    const saida_embalagem_registros: SaidaEmbFila[] = [];
    const logsSaidaEmbOrdem = [...(saidaEmbalagemLogsByOrdem.get(item.id) ?? [])].sort(
      (a, b) => new Date(b.inicio ?? 0).getTime() - new Date(a.inicio ?? 0).getTime(),
    );
    for (const log of logsSaidaEmbOrdem) {
      const dq = log.dados_qualidade as { caixas_recebidas?: number } | null;
      const cr = dq?.caixas_recebidas;
      if (cr == null || !Number.isFinite(Number(cr))) continue;
      const caixas = Math.round(Number(cr));
      const inicioRaw = log.inicio ?? log.fim ?? '';
      let registrado_em = '—';
      if (inicioRaw) {
        try {
          registrado_em = new Date(inicioRaw).toLocaleString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          });
        } catch {
          registrado_em = String(inicioRaw);
        }
      }
      saida_embalagem_registros.push({
        log_id: log.id,
        caixas,
        em_andamento: log.fim == null,
        registrado_em,
      });
    }

    const saida_embalagem_caixas_informadas = saidaEmbalagemCaixasPorOrdem.get(item.id) ?? null;

    const clienteId = item.pedidos?.cliente_id;
    const somenteLataAntigaCliente = clienteId
      ? Boolean(somenteLataAntigaPorCliente.get(String(clienteId)))
      : false;
    const produtoParaNomeLata =
      produtoJoinFaltando || !produto
        ? null
        : {
            unidades_assadeira: produto.unidades_assadeira ?? null,
            unidades_lata_antiga: latExtra?.antiga ?? null,
            unidades_lata_nova: latExtra?.nova ?? null,
          };
    const opAssadeiraId = (item as { assadeira_id?: string | null }).assadeira_id?.trim() ?? null;
    const nomeLataDefinidoNaOp = opAssadeiraId ? (nomeAssadeiraPorId.get(opAssadeiraId) ?? null) : null;
    const bloqueadosLata =
      clienteId && String(clienteId).trim()
        ? (bloqueiosPorCliente.get(String(clienteId)) ?? new Set<string>())
        : new Set<string>();
    const lataInferida =
      produtoParaNomeLata != null
        ? nomeLataTipoParaOrdem(
            item.produto_id,
            produtoParaNomeLata,
            somenteLataAntigaCliente,
            linksByProduto,
            bloqueadosLata,
          )
        : null;
    const lata_tipo_nome = nomeLataDefinidoNaOp ?? lataInferida;

    return {
      ...item,
      produtoJoinFaltando,
      produtoCargaFilaErro,
      produtos: {
        ...produto,
        nome: produto?.nome || (produtoCargaFilaErro ? 'Cadastro temporariamente indisponível' : produtoJoinFaltando ? 'Produto não encontrado' : 'Produto sem nome'),
        unidadeNomeResumido,
        receita_massa: receitaMassa,
        unidades_assadeira: unidadesAssadeiraEfetiva,
        unidades_lata_antiga: uaAntiga,
        unidades_lata_nova: uaNova,
      },
      receitas_batidas: receitasBatidas,
      receitas_fermentacao: receitasFermentacao,
      fermentacao_volume_concluido,
      forno_volume_concluido,
      fermentacao_carrinhos,
      carrinhos_disponiveis_forno,
      forno_entrada_latas_total,
      entrada_forno_entradas,
      saida_forno_bandejas_total,
      saida_forno_registros,
      entrada_embalagem_latas_total,
      entrada_embalagem_registros,
      entrada_embalagem_registros_count,
      saida_embalagem_caixas_informadas,
      saida_embalagem_registros,
      qtd_massa_finalizada: qtdMassaFinalizada,
      estoque_resumo,
      estoque_unidades_consumo,
      planejado_unidades_consumo,
      qtd_a_produzir_planejada,
      lata_tipo_nome,
      caixas_planejadas: caixasPlanejadasPorOp.get(String(item.id)) ?? null,
      observacao_producao: observacaoProducaoPorOp.get(String(item.id)) ?? null,
      observacao_embalagem: observacaoEmbalagemPorOp.get(String(item.id)) ?? null,
    };
  });

  // Ordenação: ordem_planejamento (crescente, sem número por último) > data_producao > created_at
  type OrdemProducaoCompleta = OrdemProducaoWithProduto & {
    data_producao?: string | null;
    created_at?: string | null;
    ordem_planejamento?: number | null;
  };
  const sortedData = (transformedData as OrdemProducaoCompleta[]).sort((a, b) => {
    const oa = a.ordem_planejamento;
    const ob = b.ordem_planejamento;
    const na = oa == null || Number.isNaN(Number(oa)) ? Number.MAX_SAFE_INTEGER : Number(oa);
    const nb = ob == null || Number.isNaN(Number(ob)) ? Number.MAX_SAFE_INTEGER : Number(ob);
    if (na !== nb) return na - nb;

    const dataA = a.data_producao ? new Date(a.data_producao).getTime() : Number.MAX_SAFE_INTEGER;
    const dataB = b.data_producao ? new Date(b.data_producao).getTime() : Number.MAX_SAFE_INTEGER;
    if (dataA !== dataB) {
      return dataA - dataB;
    }

    const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return createdA - createdB;
  });

  return sortedData;
}

/** Opção devolvida ao autocomplete remoto (nova ordem / planejamento). */
export type ProdutoAutocompleteOption = {
  id: string;
  label: string;
  meta: Record<string, unknown>;
};

type ProdutoRowForAutocomplete = {
  id: string;
  nome: string;
  codigo: string;
  unidade_padrao_id: string | null;
  package_units: number | null;
  box_units: number | null;
  unidades_assadeira: number | null;
  /** Ausentes quando a BD ainda não tem migração `unidades_lata_*`. */
  unidades_lata_antiga?: number | null;
  unidades_lata_nova?: number | null;
  unidades: { nome_resumido: string } | null;
};

function sanitizeIlikeQuery(raw: string): string {
  return raw.replace(/[%_\\,]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Valor entre aspas duplas para uso em `.or()` do PostgREST (vírgulas no texto). */
function postgrestQuotedValue(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '""')}"`;
}

async function receitasMassaMapForProdutoIds(
  supabase: ReturnType<typeof supabaseClientFactory.createServiceRoleClient>,
  produtoIds: string[],
): Promise<Map<string, { quantidade_por_produto: number }>> {
  const map = new Map<string, { quantidade_por_produto: number }>();
  if (produtoIds.length === 0) return map;

  const { rows: receitasRows, error: receitasError } = await loadProdutoReceitasMassaLinkRows(
    supabase,
    produtoIds,
  );

  if (receitasError) {
    console.error(
      'Erro ao buscar receitas (autocomplete produto):',
      JSON.stringify(serializeSupabaseError(receitasError)),
    );
    return map;
  }

  receitasRows.forEach((pr) => {
    if (!isVinculoReceitaMassaAtiva(pr)) return;
    if (!map.has(pr.produto_id)) {
      map.set(pr.produto_id, { quantidade_por_produto: pr.quantidade_por_produto });
    }
  });

  return map;
}

function rowToAutocompleteOption(
  row: ProdutoRowForAutocomplete,
  receitasMap: Map<string, { quantidade_por_produto: number }>,
): ProdutoAutocompleteOption {
  const nomeResumido = row.unidades?.nome_resumido?.trim() ?? '';
  const receita = receitasMap.get(row.id);
  return {
    id: row.id,
    label: row.codigo ? `${row.nome} (${row.codigo})` : row.nome,
    meta: {
      unidadeNomeResumido: nomeResumido,
      unidade_padrao_id: row.unidade_padrao_id,
      package_units: row.package_units,
      box_units: row.box_units,
      unidades_assadeira: row.unidades_assadeira,
      unidades_lata_antiga: row.unidades_lata_antiga ?? null,
      unidades_lata_nova: row.unidades_lata_nova ?? null,
      receita_massa: receita ?? null,
    },
  };
}

/** Com colunas `unidades_lata_*` quando a migração já foi aplicada em `interno.produtos`. */
const PRODUTO_AUTOCOMPLETE_SELECT_COM_LATA =
  'id, nome, codigo, unidade_padrao_id, package_units, box_units, unidades_assadeira, unidades_lata_antiga, unidades_lata_nova';
/** Fallback (42703): mesma ideia que `SELECT_PRODUTOS_SEM_LATA` na fila. */
const PRODUTO_AUTOCOMPLETE_SELECT_SEM_LATA =
  'id, nome, codigo, unidade_padrao_id, package_units, box_units, unidades_assadeira';

async function attachUnidadesNomeResumido<
  T extends { id: string; unidade_padrao_id?: string | null },
>(
  supabase: ReturnType<typeof supabaseClientFactory.createServiceRoleClient>,
  rows: T[],
): Promise<(T & { unidades: { nome_resumido: string } | null })[]> {
  const uids = [
    ...new Set(
      rows.map((r) => r.unidade_padrao_id).filter((id): id is string => Boolean(id && String(id).trim())),
    ),
  ];
  const unNome = new Map<string, string>();
  if (uids.length > 0) {
    const { data: uRows, error: uErr } = await supabase
      .from('unidades')
      .select('id, nome_resumido')
      .in('id', uids);
    if (!uErr && uRows) {
      for (const u of uRows as { id: string; nome_resumido?: string | null }[]) {
        unNome.set(u.id, (u.nome_resumido ?? '').trim());
      }
    }
  }
  return rows.map((r) => {
    const up = r.unidade_padrao_id?.trim();
    const nr = up ? unNome.get(up) : undefined;
    return {
      ...r,
      unidades: nr != null && nr !== '' ? { nome_resumido: nr } : { nome_resumido: '' },
    };
  });
}

export async function searchProdutosParaAutocomplete(query: string) {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const q = sanitizeIlikeQuery(query);

  let first =
    q.length < 1
      ? await supabase
          .from('produtos')
          .select(PRODUTO_AUTOCOMPLETE_SELECT_COM_LATA)
          .eq('ativo', true)
          .order('nome', { ascending: true })
          .limit(25)
      : await supabase
          .from('produtos')
          .select(PRODUTO_AUTOCOMPLETE_SELECT_COM_LATA)
          .eq('ativo', true)
          .or(`nome.ilike.${postgrestQuotedValue(`%${q}%`)},codigo.ilike.${postgrestQuotedValue(`%${q}%`)}`)
          .order('nome', { ascending: true })
          .limit(25);

  let data: ProdutoRowForAutocomplete[] | null =
    (first.data as unknown as ProdutoRowForAutocomplete[] | null) ?? null;
  let error = first.error;
  if (error && isProdutosUnidadesLataColumnsMissing(error)) {
    const second =
      q.length < 1
        ? await supabase
            .from('produtos')
            .select(PRODUTO_AUTOCOMPLETE_SELECT_SEM_LATA)
            .eq('ativo', true)
            .order('nome', { ascending: true })
            .limit(25)
        : await supabase
            .from('produtos')
            .select(PRODUTO_AUTOCOMPLETE_SELECT_SEM_LATA)
            .eq('ativo', true)
            .or(`nome.ilike.${postgrestQuotedValue(`%${q}%`)},codigo.ilike.${postgrestQuotedValue(`%${q}%`)}`)
            .order('nome', { ascending: true })
            .limit(25);
    data = (second.data as unknown as ProdutoRowForAutocomplete[] | null) ?? null;
    error = second.error;
  }

  if (error) {
    console.error(
      'searchProdutosParaAutocomplete:',
      JSON.stringify(serializeSupabaseError(error as unknown)),
    );
    return { success: false as const, options: [] as ProdutoAutocompleteOption[], error: 'Erro ao buscar produtos.' };
  }

  const rowsRaw = (data ?? []) as unknown as ProdutoRowForAutocomplete[];
  const rows = await attachUnidadesNomeResumido(supabase, rowsRaw);
  const ids = rows.map((r) => r.id);
  const receitasMap = await receitasMassaMapForProdutoIds(supabase, ids);
  const options = rows.map((r) => rowToAutocompleteOption(r, receitasMap));
  return { success: true as const, options };
}

export async function getProdutoAutocompleteOptionById(id: string) {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  if (!id?.trim()) {
    return { success: true as const, option: null as ProdutoAutocompleteOption | null };
  }

  let first = await supabase
    .from('produtos')
    .select(PRODUTO_AUTOCOMPLETE_SELECT_COM_LATA)
    .eq('id', id)
    .maybeSingle();

  let data: ProdutoRowForAutocomplete | null =
    (first.data as unknown as ProdutoRowForAutocomplete | null) ?? null;
  let error = first.error;
  if (error && isProdutosUnidadesLataColumnsMissing(error)) {
    const second = await supabase
      .from('produtos')
      .select(PRODUTO_AUTOCOMPLETE_SELECT_SEM_LATA)
      .eq('id', id)
      .maybeSingle();
    data = (second.data as unknown as ProdutoRowForAutocomplete | null) ?? null;
    error = second.error;
  }

  if (error) {
    console.error(
      'getProdutoAutocompleteOptionById:',
      JSON.stringify(serializeSupabaseError(error as unknown)),
    );
    return { success: false as const, option: null as ProdutoAutocompleteOption | null, error: 'Erro ao carregar produto.' };
  }

  if (!data) {
    return { success: true as const, option: null as ProdutoAutocompleteOption | null };
  }

  const [row] = await attachUnidadesNomeResumido(supabase, [data as unknown as ProdutoRowForAutocomplete]);
  const receitasMap = await receitasMassaMapForProdutoIds(supabase, [row.id]);
  return { success: true as const, option: rowToAutocompleteOption(row, receitasMap) };
}

// --- Ordem de produção diária (planejamento) ---
const ORDENS_PRODUCAO_DIARIAS_LINHA_STATUSES = [
  'rascunho',
  'pronto',
  'em_producao',
  'concluido',
] as const;

export type CreateOrdemProducaoDiariaInput = {
  dataProducao: string;
  dataEtiquetaDefault?: string;
};

function normalizeOrdemDiariaDate(value: string | undefined | null): string | null {
  const t = value?.trim();
  if (!t) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  return t;
}

function parseOptionalOrdemDiariaDate(
  value: string | null | undefined,
  label: string,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (value == null || (typeof value === 'string' && value.trim() === '')) {
    return { ok: true, value: null };
  }
  const v = normalizeOrdemDiariaDate(value);
  if (!v) return { ok: false, error: `${label} inválida.` };
  return { ok: true, value: v };
}

function sanitizeClientesLista(nomes: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const n of nomes) {
    const t = String(n ?? '').trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

const OBS_ORDEM_DIARIA_LINHA_MAX = 500;

function sanitizeObservacaoLinhaOrdemDiaria(value: string | undefined | null): string | null {
  const t = String(value ?? '').trim();
  if (!t) return null;
  return t.slice(0, OBS_ORDEM_DIARIA_LINHA_MAX);
}

function parseStatusLinha(
  v: string | undefined,
): typeof ORDENS_PRODUCAO_DIARIAS_LINHA_STATUSES[number] | undefined {
  if (v === undefined || v === null) return undefined;
  const t = String(v).trim();
  if (!t) return undefined;
  if ((ORDENS_PRODUCAO_DIARIAS_LINHA_STATUSES as readonly string[]).includes(t)) {
    return t as (typeof ORDENS_PRODUCAO_DIARIAS_LINHA_STATUSES)[number];
  }
  return undefined;
}

function isMissingOrdemDiariaTableError(message: string | undefined): boolean {
  const m = String(message ?? '').toLowerCase();
  /** Coluna em falta (ex.: migração incremental) — não confundir com tabela inexistente. */
  if (m.includes('column') && m.includes('does not exist')) return false;
  return (
    m.includes('ordens_producao_diarias') &&
    (m.includes('does not exist') || m.includes('schema cache') || m.includes('could not find'))
  );
}

/** Select de itens falhou por coluna/embed em falta — tentar SELECT mais conservador. */
function isRetryOrdemDiariaItensSelectError(message: string | undefined): boolean {
  const m = String(message ?? '').toLowerCase();
  if (isMissingOrdemDiariaTableError(message)) return false;
  if (m.includes('42501') || m.includes('permission denied')) return false;
  return (
    m.includes('column') ||
    m.includes('does not exist') ||
    m.includes('schema cache') ||
    m.includes('could not find') ||
    m.includes('pgrst200') ||
    m.includes('pgrst204') ||
    m.includes('42703')
  );
}

function isMissingTipoCaixaEmbalagemIdColumnError(message: string | undefined): boolean {
  const m = String(message ?? '').toLowerCase();
  return (
    m.includes('tipo_caixa_embalagem_id') &&
    (m.includes('does not exist') ||
      m.includes('column') ||
      m.includes('42703') ||
      m.includes('schema cache') ||
      m.includes('could not find'))
  );
}

const ORDEM_DIARIA_ITENS_SELECT_COM_TIPO_EMBED = `
      id,
      prioridade,
      produto_id,
      tipo_lata,
      latas_planejadas,
      caixas_estimadas,
      tipo_caixa_embalagem_id,
      clientes,
      data_producao_override,
      data_etiqueta_override,
      observacao,
      observacao_embalagem,
      observacao_producao,
      status_linha,
      ordens_producao_id,
      ordens_producao ( lote_codigo ),
      produtos ( nome ),
      tipos_caixa_embalagem ( id, nome, unidades_por_caixa, clientes ( nome_fantasia ) )
    `;

const ORDEM_DIARIA_ITENS_SELECT_PADRAO = `
      id,
      prioridade,
      produto_id,
      tipo_lata,
      latas_planejadas,
      caixas_estimadas,
      tipo_caixa_embalagem_id,
      clientes,
      data_producao_override,
      data_etiqueta_override,
      observacao,
      observacao_embalagem,
      observacao_producao,
      status_linha,
      ordens_producao_id,
      ordens_producao ( lote_codigo ),
      produtos ( nome )
    `;

const ORDEM_DIARIA_ITENS_SELECT_MINIMO = `
      id,
      prioridade,
      produto_id,
      tipo_lata,
      latas_planejadas,
      caixas_estimadas,
      tipo_caixa_embalagem_id,
      clientes,
      data_producao_override,
      data_etiqueta_override,
      observacao,
      status_linha,
      ordens_producao_id,
      ordens_producao ( lote_codigo ),
      produtos ( nome )
    `;

const ORDEM_DIARIA_ESTRUTURA_FALTANDO_MSG =
  'Ordem diária: as tabelas interno.ordens_producao_diarias (e itens) não existem neste banco. Crie-as com o script SQL do repositório (pasta sql/).';

const ORDEM_DIARIA_PERMISSION_MSG =
  'Permissão negada nas tabelas da ordem diária (Postgres 42501). No Supabase → SQL Editor, execute o ficheiro sql/PATCH_GRANT_ORDEM_DIARIA_INTERNO.sql no mesmo projecto do SUPABASE_URL, depois recarregue esta página.';

async function fetchOrdemDiariaHeaderDates(
  supabase: ReturnType<typeof supabaseClientFactory.createServiceRoleClient>,
  ordemDiariaId: string,
): Promise<{ ok: true; header: DiariaHeaderDates } | { ok: false; error: string }> {
  const { data: h, error } = await supabase
    .from('ordens_producao_diarias')
    .select('data_producao, data_etiqueta_default')
    .eq('id', ordemDiariaId)
    .maybeSingle();
  if (error) {
    if (isMissingOrdemDiariaTableError(error.message)) {
      return { ok: false, error: ORDEM_DIARIA_ESTRUTURA_FALTANDO_MSG };
    }
    return { ok: false, error: error.message };
  }
  if (!h) return { ok: false, error: 'Ordem diária não encontrada.' };
  return {
    ok: true,
    header: {
      dataProducao: normalizeToISODate(String(h.data_producao)),
      dataEtiquetaDefault: normalizeToISODate(String(h.data_etiqueta_default)),
    },
  };
}

/** Cria o cabecalho da ordem planejada para um dia (`data_producao` única). */
export async function createOrdemProducaoDiaria(
  input: CreateOrdemProducaoDiariaInput,
): Promise<
  | { success: true; ordemId: string; alreadyExisted?: boolean }
  | { success: false; error: string }
> {
  const dataProducao = normalizeOrdemDiariaDate(input.dataProducao);
  if (!dataProducao) {
    return { success: false, error: 'Data de produção inválida.' };
  }
  const dataEtiquetaDefault = normalizeOrdemDiariaDate(input.dataEtiquetaDefault ?? dataProducao);
  if (!dataEtiquetaDefault) {
    return { success: false, error: 'Data da etiqueta padrão inválida.' };
  }

  const supabase = supabaseClientFactory.createServiceRoleClient();
  const { data, error } = await supabase
    .from('ordens_producao_diarias')
    .insert({
      data_producao: dataProducao,
      data_etiqueta_default: dataEtiquetaDefault,
      status: 'rascunho',
    })
    .select('id')
    .single();

  if (error) {
    if (isMissingOrdemDiariaTableError(error.message)) {
      return {
        success: false,
        error: ORDEM_DIARIA_ESTRUTURA_FALTANDO_MSG,
      };
    }
    if ((error as { code?: string }).code === '23505') {
      const { data: existing, error: selErr } = await supabase
        .from('ordens_producao_diarias')
        .select('id')
        .eq('data_producao', dataProducao)
        .order('id', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!selErr && existing?.id) {
        revalidatePath(PATH_PRODUCAO_ORDEM_DIARIA);
        return { success: true, ordemId: existing.id, alreadyExisted: true };
      }
      return { success: false, error: 'Já existe ordem para esta data de produção.' };
    }
    console.error('createOrdemProducaoDiaria', serializeSupabaseError(error));
    return { success: false, error: error.message };
  }

  revalidatePath(PATH_PRODUCAO_ORDEM_DIARIA);
  return { success: true, ordemId: data!.id };
}

async function resolveCaixasEstimadasParaOrdemDiariaItem(
  supabase: ReturnType<typeof supabaseClientFactory.createServiceRoleClient>,
  args: {
    produtoId: string;
    tipoLataAssadeiraId: string;
    latasPlanejadas: number;
    caixasInformadasCliente: number;
    tipoCaixaEmbalagemId?: string | null;
  },
): Promise<number> {
  let numeroBuracos = 0;
  let unidadesPorAssadeiraCad = 0;
  const { data: paFull } = await supabase
    .from('produto_assadeiras')
    .select('unidades_por_assadeira')
    .eq('produto_id', args.produtoId)
    .eq('assadeira_id', args.tipoLataAssadeiraId)
    .maybeSingle();
  unidadesPorAssadeiraCad =
    Math.round(Number((paFull as { unidades_por_assadeira?: number })?.unidades_por_assadeira ?? 0)) || 0;
  const { data: assFull } = await supabase
    .from('assadeiras')
    .select('numero_buracos')
    .eq('id', args.tipoLataAssadeiraId)
    .maybeSingle();
  numeroBuracos =
    Math.round(Number((assFull as { numero_buracos?: number })?.numero_buracos ?? 0)) || 0;

  const { data: pr } = await supabase
    .from('produtos')
    .select('box_units')
    .eq('id', args.produtoId)
    .maybeSingle();
  let boxUnits: number | null = null;
  const bu = (pr as { box_units?: number | null })?.box_units;
  if (bu != null && Number(bu) > 0) boxUnits = Math.round(Number(bu));

  let unidadesPorCaixa: number | null = null;
  const tipoId = args.tipoCaixaEmbalagemId?.trim();
  if (tipoId) {
    const { data: tipoRow, error: tipoErr } = await supabase
      .from('tipos_caixa_embalagem')
      .select('unidades_por_caixa, ativo')
      .eq('id', tipoId)
      .maybeSingle();
    const tipoMsg = String(tipoErr?.message ?? '').toLowerCase();
    const tipoMissing =
      tipoErr &&
      (tipoMsg.includes('does not exist') || tipoMsg.includes('schema cache') || tipoMsg.includes('could not find'));
    if (!tipoErr && tipoRow && (tipoRow as { ativo?: boolean }).ativo !== false) {
      const uTipo = Math.round(Number((tipoRow as { unidades_por_caixa?: number }).unidades_por_caixa ?? 0));
      let boxOv: number | null = null;
      const { data: ovRow, error: ovErr } = await supabase
        .from('produtos_tipos_caixa_embalagem')
        .select('box_units_override')
        .eq('produto_id', args.produtoId)
        .eq('tipo_caixa_embalagem_id', tipoId)
        .maybeSingle();
      const ovMsg = String(ovErr?.message ?? '').toLowerCase();
      const ovMissing =
        ovErr &&
        (ovMsg.includes('does not exist') || ovMsg.includes('schema cache') || ovMsg.includes('could not find'));
      if (!ovErr && ovRow) {
        const raw = (ovRow as { box_units_override?: number | null }).box_units_override;
        if (raw != null && Number(raw) > 0) boxOv = Math.round(Number(raw));
      } else if (ovErr && !ovMissing) {
        console.warn('resolveCaixasEstimadas produtos_tipos_caixa_embalagem', ovErr.message);
      }
      const uEff = boxOv ?? (uTipo > 0 ? uTipo : null);
      if (uEff != null && uEff > 0) unidadesPorCaixa = uEff;
    } else if (tipoErr && !tipoMissing) {
      console.warn('resolveCaixasEstimadas tipos_caixa_embalagem', tipoErr.message);
    }
  }

  const hasCaixa =
    (unidadesPorCaixa != null && unidadesPorCaixa > 0) || (boxUnits != null && boxUnits > 0);
  if (!hasCaixa) {
    return Math.max(0, Math.round(args.caixasInformadasCliente));
  }

  return estimateCaixasFromLatas({
    latas: args.latasPlanejadas,
    numeroBuracosAssadeira: numeroBuracos,
    unidadesPorAssadeiraCadastro: unidadesPorAssadeiraCad,
    unidadesPorCaixa,
    boxUnits: unidadesPorCaixa != null && unidadesPorCaixa > 0 ? null : boxUnits,
  });
}

/** Preview na UI: unidades por caixa efetivas (override produto×tipo → tipo → só produto.box_units). */
export async function getUnidadesCaixaPreviewOrdemDiaria(
  produtoId: string,
  tipoCaixaEmbalagemId: string | null,
): Promise<
  | { success: true; unidadesPorCaixa: number | null; boxUnitsFallback: number | null }
  | { success: false; error: string }
> {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const pid = produtoId?.trim();
  if (!pid) return { success: false, error: 'Produto inválido.' };
  const { data: pr } = await supabase.from('produtos').select('box_units').eq('id', pid).maybeSingle();
  let boxUnitsFallback: number | null = null;
  const bu = (pr as { box_units?: number | null })?.box_units;
  if (bu != null && Number(bu) > 0) boxUnitsFallback = Math.round(Number(bu));

  const tid = tipoCaixaEmbalagemId?.trim();
  if (!tid) {
    return { success: true, unidadesPorCaixa: null, boxUnitsFallback };
  }

  const { data: tipoRow, error: tipoErr } = await supabase
    .from('tipos_caixa_embalagem')
    .select('unidades_por_caixa, ativo')
    .eq('id', tid)
    .maybeSingle();
  const tipoMsg = String(tipoErr?.message ?? '').toLowerCase();
  const tipoMissing =
    tipoErr &&
    (tipoMsg.includes('does not exist') || tipoMsg.includes('schema cache') || tipoMsg.includes('could not find'));
  if (tipoErr && !tipoMissing) {
    return { success: false, error: tipoErr.message };
  }
  if (!tipoRow || (tipoRow as { ativo?: boolean }).ativo === false) {
    return { success: true, unidadesPorCaixa: null, boxUnitsFallback };
  }

  const uTipo = Math.round(Number((tipoRow as { unidades_por_caixa?: number }).unidades_por_caixa ?? 0));
  let boxOv: number | null = null;
  const { data: ovRow, error: ovErr } = await supabase
    .from('produtos_tipos_caixa_embalagem')
    .select('box_units_override')
    .eq('produto_id', pid)
    .eq('tipo_caixa_embalagem_id', tid)
    .maybeSingle();
  const ovMsg = String(ovErr?.message ?? '').toLowerCase();
  const ovMissing =
    ovErr && (ovMsg.includes('does not exist') || ovMsg.includes('schema cache') || ovMsg.includes('could not find'));
  if (!ovErr && ovRow) {
    const raw = (ovRow as { box_units_override?: number | null }).box_units_override;
    if (raw != null && Number(raw) > 0) boxOv = Math.round(Number(raw));
  } else if (ovErr && !ovMissing) {
    return { success: false, error: ovErr.message };
  }

  const uEff = boxOv ?? (uTipo > 0 ? uTipo : null);
  if (uEff != null && uEff > 0) {
    return { success: true, unidadesPorCaixa: uEff, boxUnitsFallback: null };
  }
  return { success: true, unidadesPorCaixa: null, boxUnitsFallback };
}

export type UpsertOrdemProducaoItemInput = {
  ordemId: string;
  itemId?: string;
  prioridade?: number;
  produtoId: string;
  tipoLata: OrdemProducaoLataSelecao;
  latasPlanejadas: number;
  caixasEstimadas: number;
  clientes: string[];
  dataProducaoOverride?: string | null;
  dataEtiquetaOverride?: string | null;
  /** Notas para embalagem. */
  observacaoEmbalagem?: string | null;
  /** Notas para produção. */
  observacaoProducao?: string | null;
  /** Tipo de caixa (cadastro por cliente) para conversão latas → caixas. */
  tipoCaixaEmbalagemId?: string | null;
  statusLinha?: string;
};

export async function upsertOrdemProducaoItem(
  input: UpsertOrdemProducaoItemInput,
): Promise<{ success: true; itemId: string } | { success: false; error: string }> {
  const ordemId = input.ordemId?.trim();
  if (!ordemId) return { success: false, error: 'Ordem inválida.' };
  const produtoId = input.produtoId?.trim();
  if (!produtoId) return { success: false, error: 'Produto inválido.' };
  const tipoLataRaw = String(input.tipoLata ?? '').trim();
  if (!tipoLataRaw) return { success: false, error: 'Lata obrigatória.' };
  const tipoLower = tipoLataRaw.toLowerCase();
  if (tipoLower === 'antiga' || tipoLower === 'nova' || tipoLower === 'outra') {
    return {
      success: false,
      error: 'Selecione uma lata no cadastro do produto (Produtos → Latas). Os valores antiga/nova/outra deixaram de ser usados.',
    };
  }
  const uuidOk =
    tipoLataRaw.length === 36 &&
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(tipoLataRaw);
  if (!uuidOk) {
    return { success: false, error: 'Identificador de lata inválido. Escolha uma opção na lista de latas do produto.' };
  }

  const supabase = supabaseClientFactory.createServiceRoleClient();

  const { data: paLinha, error: paLinhaErr } = await supabase
    .from('produto_assadeiras')
    .select('id')
    .eq('produto_id', produtoId)
    .eq('assadeira_id', tipoLataRaw)
    .maybeSingle();
  if (paLinhaErr) {
    return { success: false, error: paLinhaErr.message };
  }
  if (!paLinha) {
    return {
      success: false,
      error: 'A lata escolhida não está cadastrada para este produto.',
    };
  }

  const tipoLata = tipoLataRaw;
  const latasPlanejadas = Math.round(Number(input.latasPlanejadas));
  if (!Number.isFinite(latasPlanejadas) || latasPlanejadas < 0) {
    return { success: false, error: 'Latas planejadas inválidas.' };
  }
  const caixasInformadas = Math.round(Number(input.caixasEstimadas));
  if (!Number.isFinite(caixasInformadas) || caixasInformadas < 0) {
    return { success: false, error: 'Caixas estimadas inválidas.' };
  }
  const tipoCaixaEmbalagemIdNorm = input.tipoCaixaEmbalagemId?.trim() || null;
  if (tipoCaixaEmbalagemIdNorm) {
    const { data: tOk, error: tErr } = await supabase
      .from('tipos_caixa_embalagem')
      .select('id')
      .eq('id', tipoCaixaEmbalagemIdNorm)
      .eq('ativo', true)
      .maybeSingle();
    if (tErr) {
      const tm = String(tErr.message ?? '').toLowerCase();
      if (!tm.includes('does not exist') && !tm.includes('schema cache') && !tm.includes('could not find')) {
        return { success: false, error: tErr.message };
      }
    } else if (!tOk) {
      return { success: false, error: 'Tipo de caixa inválido ou inativo.' };
    }
  }
  const caixasEstimadas = await resolveCaixasEstimadasParaOrdemDiariaItem(supabase, {
    produtoId,
    tipoLataAssadeiraId: tipoLata,
    latasPlanejadas,
    caixasInformadasCliente: caixasInformadas,
    tipoCaixaEmbalagemId: tipoCaixaEmbalagemIdNorm,
  });
  if (!Number.isFinite(caixasEstimadas) || caixasEstimadas < 0) {
    return { success: false, error: 'Caixas estimadas inválidas.' };
  }

  let statusLinha: (typeof ORDENS_PRODUCAO_DIARIAS_LINHA_STATUSES)[number] = 'rascunho';
  if (
    input.statusLinha !== undefined &&
    input.statusLinha !== null &&
    String(input.statusLinha).trim() !== ''
  ) {
    const s = parseStatusLinha(input.statusLinha);
    if (!s) return { success: false, error: 'Status da linha inválido.' };
    statusLinha = s;
  }
  const clientesJson = sanitizeClientesLista(input.clientes ?? []) as unknown as Json;
  const obsEmb = sanitizeObservacaoLinhaOrdemDiaria(input.observacaoEmbalagem);
  const obsPro = sanitizeObservacaoLinhaOrdemDiaria(input.observacaoProducao);

  const rProd = parseOptionalOrdemDiariaDate(
    input.dataProducaoOverride,
    'Data de produção (linha)',
  );
  if (!rProd.ok) return { success: false, error: rProd.error };
  const dataProdOverrideResolved =
    input.dataProducaoOverride !== undefined ? rProd.value : undefined;

  const rEti = parseOptionalOrdemDiariaDate(
    input.dataEtiquetaOverride,
    'Data da etiqueta (linha)',
  );
  if (!rEti.ok) return { success: false, error: rEti.error };
  const dataEtiOverrideResolved =
    input.dataEtiquetaOverride !== undefined ? rEti.value : undefined;

  const itemId = input.itemId?.trim();

  if (itemId) {
    const updateRow: {
      produto_id: string;
      tipo_lata: string;
      latas_planejadas: number;
      caixas_estimadas: number;
      clientes: Json;
      observacao_embalagem: string | null;
      observacao_producao: string | null;
      observacao: string | null;
      status_linha: (typeof ORDENS_PRODUCAO_DIARIAS_LINHA_STATUSES)[number];
      updated_at: string;
      prioridade?: number;
      data_producao_override?: string | null;
      data_etiqueta_override?: string | null;
      tipo_caixa_embalagem_id?: string | null;
    } = {
      produto_id: produtoId,
      tipo_lata: tipoLata,
      latas_planejadas: latasPlanejadas,
      caixas_estimadas: caixasEstimadas,
      clientes: clientesJson,
      observacao_embalagem: obsEmb,
      observacao_producao: obsPro,
      observacao: obsPro,
      status_linha: statusLinha,
      updated_at: new Date().toISOString(),
      tipo_caixa_embalagem_id: tipoCaixaEmbalagemIdNorm,
    };
    if (input.prioridade !== undefined) {
      const p = Math.round(Number(input.prioridade));
      if (!Number.isFinite(p)) {
        return { success: false, error: 'Prioridade inválida.' };
      }
      updateRow.prioridade = p;
    }
    if (dataProdOverrideResolved !== undefined) {
      updateRow.data_producao_override = dataProdOverrideResolved;
    }
    if (dataEtiOverrideResolved !== undefined) {
      updateRow.data_etiqueta_override = dataEtiOverrideResolved;
    }

    let upErr = (
      await supabase
        .from('ordens_producao_diarias_itens')
        .update(updateRow)
        .eq('id', itemId)
        .eq('ordem_diaria_id', ordemId)
    ).error;

    if (upErr && isMissingTipoCaixaEmbalagemIdColumnError(upErr.message)) {
      const { tipo_caixa_embalagem_id: _omitTc, ...updateRowSemTipo } = updateRow;
      upErr = (
        await supabase
          .from('ordens_producao_diarias_itens')
          .update(updateRowSemTipo)
          .eq('id', itemId)
          .eq('ordem_diaria_id', ordemId)
      ).error;
    }

    if (upErr) {
      if (isMissingOrdemDiariaTableError(upErr.message)) {
        return {
          success: false,
          error: ORDEM_DIARIA_ESTRUTURA_FALTANDO_MSG,
        };
      }
      console.error('upsertOrdemProducaoItem update', serializeSupabaseError(upErr));
      return { success: false, error: upErr.message };
    }

    const { data: rowAfter, error: selAfterErr } = await supabase
      .from('ordens_producao_diarias_itens')
      .select(
        'id, ordem_diaria_id, prioridade, ordens_producao_id, data_producao_override',
      )
      .eq('id', itemId)
      .eq('ordem_diaria_id', ordemId)
      .maybeSingle();

    if (selAfterErr) {
      if (isMissingOrdemDiariaTableError(selAfterErr.message)) {
        return { success: false, error: ORDEM_DIARIA_ESTRUTURA_FALTANDO_MSG };
      }
      console.error(
        'upsertOrdemProducaoItem sync select',
        serializeSupabaseError(selAfterErr),
      );
      return { success: false, error: selAfterErr.message };
    }
    if (!rowAfter) {
      return {
        success: false,
        error: 'Linha da ordem diária não encontrada após gravação.',
      };
    }

    const hdr = await fetchOrdemDiariaHeaderDates(supabase, rowAfter.ordem_diaria_id);
    if (!hdr.ok) return { success: false, error: hdr.error };

    if (!rowAfter.ordens_producao_id) {
      const created = await insertOrdemProducaoForDiariaItem({
        supabase,
        header: hdr.header,
        itemId,
        prioridade: rowAfter.prioridade,
        produtoId,
        tipoLata,
        latasPlanejadas,
        dataProducaoOverride: rowAfter.data_producao_override,
      });
      if ('error' in created) {
        return { success: false, error: created.error };
      }
    } else {
      const updated = await updateOrdemProducaoForDiariaItem({
        supabase,
        opId: rowAfter.ordens_producao_id,
        header: hdr.header,
        prioridade: input.prioridade ?? rowAfter.prioridade,
        produtoId,
        tipoLata,
        latasPlanejadas,
        dataProducaoOverride: dataProdOverrideResolved ?? rowAfter.data_producao_override ?? null,
      });
      if ('error' in updated) {
        return { success: false, error: updated.error };
      }
    }

    revalidatePath(PATH_PRODUCAO_ORDEM_DIARIA);
    revalidatePath('/producao/fila');
    return { success: true, itemId };
  }

  const prioridadeInput = input.prioridade;
  let prioridade =
    prioridadeInput !== undefined ? Math.round(Number(prioridadeInput)) : NaN;
  if (!Number.isFinite(prioridade)) {
    const { data: maxPri, error: priErr } = await supabase
      .from('ordens_producao_diarias_itens')
      .select('prioridade')
      .eq('ordem_diaria_id', ordemId)
      .order('prioridade', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (priErr) {
      if (isMissingOrdemDiariaTableError(priErr.message)) {
        return {
          success: false,
          error: ORDEM_DIARIA_ESTRUTURA_FALTANDO_MSG,
        };
      }
      console.error('upsertOrdemProducaoItem max prioridade', serializeSupabaseError(priErr));
      return { success: false, error: priErr.message };
    }
    prioridade = maxPri?.prioridade != null && !Number.isNaN(Number(maxPri.prioridade))
      ? Number(maxPri.prioridade) + 1
      : 1;
  }

  const insertRow = {
    ordem_diaria_id: ordemId,
    prioridade,
    produto_id: produtoId,
    tipo_lata: tipoLata,
    latas_planejadas: latasPlanejadas,
    caixas_estimadas: caixasEstimadas,
    tipo_caixa_embalagem_id: tipoCaixaEmbalagemIdNorm,
    clientes: clientesJson,
    data_producao_override: dataProdOverrideResolved ?? null,
    data_etiqueta_override: dataEtiOverrideResolved ?? null,
    observacao_embalagem: obsEmb,
    observacao_producao: obsPro,
    observacao: obsPro,
    status_linha: statusLinha,
  };

  let insertRes = await supabase
    .from('ordens_producao_diarias_itens')
    .insert(insertRow)
    .select('id')
    .single();

  if (insertRes.error && isMissingTipoCaixaEmbalagemIdColumnError(insertRes.error.message)) {
    const { tipo_caixa_embalagem_id: _omitTcI, ...insertRowSemTipo } = insertRow;
    insertRes = await supabase
      .from('ordens_producao_diarias_itens')
      .insert(insertRowSemTipo)
      .select('id')
      .single();
  }

  if (insertRes.error) {
    if (isMissingOrdemDiariaTableError(insertRes.error.message)) {
      return {
        success: false,
        error: ORDEM_DIARIA_ESTRUTURA_FALTANDO_MSG,
      };
    }
    console.error('upsertOrdemProducaoItem insert', serializeSupabaseError(insertRes.error));
    return { success: false, error: insertRes.error.message };
  }

  const newItemId = (insertRes.data as { id: string }).id;
  const hdrIns = await fetchOrdemDiariaHeaderDates(supabase, ordemId);
  if (!hdrIns.ok) {
    await supabase.from('ordens_producao_diarias_itens').delete().eq('id', newItemId);
    return { success: false, error: hdrIns.error };
  }

  const opIns = await insertOrdemProducaoForDiariaItem({
    supabase,
    header: hdrIns.header,
    itemId: newItemId,
    prioridade,
    produtoId,
    tipoLata,
    latasPlanejadas,
    dataProducaoOverride: dataProdOverrideResolved ?? null,
  });
  if ('error' in opIns) {
    await supabase.from('ordens_producao_diarias_itens').delete().eq('id', newItemId);
    return { success: false, error: opIns.error };
  }

  revalidatePath(PATH_PRODUCAO_ORDEM_DIARIA);
  revalidatePath('/producao/fila');
  return { success: true, itemId: newItemId };
}

export async function reorderOrdemProducaoItems(
  ordemId: string,
  items: { itemId: string; prioridade: number }[],
): Promise<{ success: true } | { success: false; error: string }> {
  const oid = ordemId?.trim();
  if (!oid) return { success: false, error: 'Ordem inválida.' };
  if (!items.length) return { success: true };

  const supabase = supabaseClientFactory.createServiceRoleClient();
  for (const row of items) {
    const iid = row.itemId?.trim();
    const pr = Math.round(Number(row.prioridade));
    if (!iid || !Number.isFinite(pr)) {
      return { success: false, error: 'Itens para reordenar inválidos.' };
    }
    const { error } = await supabase
      .from('ordens_producao_diarias_itens')
      .update({
        prioridade: pr,
        updated_at: new Date().toISOString(),
      })
      .eq('id', iid)
      .eq('ordem_diaria_id', oid);
    if (error) {
      if (isMissingOrdemDiariaTableError(error.message)) {
        return {
          success: false,
          error: ORDEM_DIARIA_ESTRUTURA_FALTANDO_MSG,
        };
      }
      console.error('reorderOrdemProducaoItems', serializeSupabaseError(error));
      return { success: false, error: error.message };
    }

    const { data: opLink, error: opLinkErr } = await supabase
      .from('ordens_producao_diarias_itens')
      .select('ordens_producao_id')
      .eq('id', iid)
      .maybeSingle();
    if (opLinkErr) {
      console.error('reorderOrdemProducaoItems op link', serializeSupabaseError(opLinkErr));
      return { success: false, error: opLinkErr.message };
    }
    if (opLink?.ordens_producao_id) {
      const { error: opUpErr } = await supabase
        .from('ordens_producao')
        .update({ ordem_planejamento: pr })
        .eq('id', opLink.ordens_producao_id);
      if (opUpErr) {
        console.error('reorderOrdemProducaoItems ordens_producao', serializeSupabaseError(opUpErr));
        return { success: false, error: opUpErr.message };
      }
    }
  }

  revalidatePath(PATH_PRODUCAO_ORDEM_DIARIA);
  revalidatePath('/producao/fila');
  return { success: true };
}

export async function removeOrdemProducaoDiariaItem(
  ordemDiariaId: string,
  itemId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const oid = ordemDiariaId?.trim();
  const iid = itemId?.trim();
  if (!oid || !iid) return { success: false, error: 'Parâmetros inválidos.' };

  const { data: item, error: selErr } = await supabase
    .from('ordens_producao_diarias_itens')
    .select('id, ordens_producao_id')
    .eq('id', iid)
    .eq('ordem_diaria_id', oid)
    .maybeSingle();

  if (selErr) return { success: false, error: selErr.message };
  if (!item) return { success: false, error: 'Linha não encontrada.' };

  if (item.ordens_producao_id) {
    const cancel = await cancelProductionOrder(item.ordens_producao_id);
    if (!cancel.success) {
      return { success: false, error: cancel.error };
    }
  }

  const { error: delErr } = await supabase
    .from('ordens_producao_diarias_itens')
    .delete()
    .eq('id', iid);
  if (delErr) return { success: false, error: delErr.message };

  revalidatePath(PATH_PRODUCAO_ORDEM_DIARIA);
  revalidatePath('/producao/fila');
  return { success: true };
}

/** Marca a ordem diária como pronta para consumo pelas metas/fila. */
export async function publishOrdemProducao(
  ordemId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const oid = ordemId?.trim();
  if (!oid) return { success: false, error: 'Ordem inválida.' };

  const supabase = supabaseClientFactory.createServiceRoleClient();
  const { data, error } = await supabase
    .from('ordens_producao_diarias')
    .update({
      status: 'pronto',
      updated_at: new Date().toISOString(),
    })
    .eq('id', oid)
    .select('id');

  if (error) {
    if (isMissingOrdemDiariaTableError(error.message)) {
      return {
        success: false,
        error: ORDEM_DIARIA_ESTRUTURA_FALTANDO_MSG,
      };
    }
    console.error('publishOrdemProducao', serializeSupabaseError(error));
    return { success: false, error: error.message };
  }

  if (!data?.length) {
    return {
      success: false,
      error:
        'Não foi possível marcar o dia: a ordem diária não foi encontrada ou não houve alteração. Recarregue a página e tente de novo.',
    };
  }

  revalidatePath(PATH_PRODUCAO_ORDEM_DIARIA, 'layout');
  revalidatePath(PATH_PRODUCAO_ORDEM_DIARIA);
  return { success: true };
}

export type OrdemProducaoDiariaItemView = {
  id: string;
  prioridade: number;
  produtoId: string;
  produtoNome: string;
  tipoLata: string;
  latasPlanejadas: number;
  caixasEstimadas: number;
  tipoCaixaEmbalagemId: string | null;
  /** Ex.: «Caixa especial (Damião)». */
  tipoCaixaResumo: string | null;
  clientes: string[];
  dataProducaoOverride: string | null;
  dataEtiquetaOverride: string | null;
  observacaoEmbalagem: string | null;
  observacaoProducao: string | null;
  statusLinha: string;
  ordensProducaoId: string | null;
  loteCodigo: string | null;
};

export type OrdemProducaoDiariaView = {
  id: string;
  dataProducao: string;
  dataEtiquetaDefault: string;
  status: string;
  itens: OrdemProducaoDiariaItemView[];
};

/**
 * Resumo de latas em uso vs. estoque por tipo de assadeira para a ordem diária.
 * A razão (em uso ÷ disponível) sinaliza quando será necessário lavar/reutilizar latas no dia.
 */
export async function getLatasUsoResumoOrdemDiaria(
  itens: ItemLataUso[],
): Promise<LataUsoTipoResumo[]> {
  const ids = [...new Set(itens.map((i) => (i.tipoLata ?? '').trim()).filter(Boolean))];
  if (ids.length === 0) return [];

  const supabase = supabaseClientFactory.createServiceRoleClient();
  const { data, error } = await supabase
    .from('assadeiras')
    .select('id, nome, quantidade_latas')
    .in('id', ids);
  if (error) return montarLatasUsoResumo(itens, new Map());

  const estoque = new Map<string, AssadeiraEstoqueInfo>();
  for (const r of data ?? []) {
    const row = r as { id: string; nome?: string | null; quantidade_latas?: number | null };
    estoque.set(row.id, {
      nome: (row.nome ?? '').trim(),
      quantidadeLatas: Math.max(0, Math.round(Number(row.quantidade_latas) || 0)),
    });
  }
  return montarLatasUsoResumo(itens, estoque);
}

/** Carrega a ordem diária por data (YYYY-MM-DD), com itens ordenados por prioridade. */
export async function getOrdemProducaoDiariaByDate(
  dataProducao: string,
): Promise<{ success: true; data: OrdemProducaoDiariaView | null } | { success: false; error: string }> {
  const date = normalizeOrdemDiariaDate(dataProducao);
  if (!date) {
    return { success: false, error: 'Data inválida.' };
  }
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const { data: headerRows, error: headErr } = await supabase
    .from('ordens_producao_diarias')
    .select('id, data_producao, data_etiqueta_default, status')
    .eq('data_producao', date)
    .order('id', { ascending: true })
    .limit(1);

  if (headErr) {
    if (isMissingOrdemDiariaTableError(headErr.message)) {
      return {
        success: false,
        error: ORDEM_DIARIA_ESTRUTURA_FALTANDO_MSG,
      };
    }
    const headCode = (headErr as { code?: string }).code;
    if (
      headCode === '42501' ||
      headErr.message.toLowerCase().includes('permission denied')
    ) {
      return { success: false, error: ORDEM_DIARIA_PERMISSION_MSG };
    }
    console.error('getOrdemProducaoDiariaByDate header', serializeSupabaseError(headErr));
    return { success: false, error: headErr.message };
  }
  const header = headerRows?.[0];
  if (!header) {
    return { success: true, data: null };
  }

  const itensSelects = [
    ORDEM_DIARIA_ITENS_SELECT_COM_TIPO_EMBED,
    ORDEM_DIARIA_ITENS_SELECT_PADRAO,
    ORDEM_DIARIA_ITENS_SELECT_MINIMO,
  ];
  let itensRows: unknown[] | null = null;
  let itensErr: { message: string; code?: string } | null = null;

  for (let si = 0; si < itensSelects.length; si++) {
    const fragment = itensSelects[si]!;
    const { data, error } = await supabase
      .from('ordens_producao_diarias_itens')
      .select(fragment.trim())
      .eq('ordem_diaria_id', header.id)
      .order('prioridade', { ascending: true });
    if (!error) {
      itensRows = data ?? [];
      itensErr = null;
      break;
    }
    itensErr = error;
    if (isMissingOrdemDiariaTableError(error.message)) {
      return {
        success: false,
        error: ORDEM_DIARIA_ESTRUTURA_FALTANDO_MSG,
      };
    }
    if (si < itensSelects.length - 1 && isRetryOrdemDiariaItensSelectError(error.message)) {
      console.warn(
        `[getOrdemProducaoDiariaByDate] select itens: retentativa ${si + 2}/${itensSelects.length}`,
        error.message,
      );
      continue;
    }
    break;
  }

  if (itensErr) {
    const itensCode = (itensErr as { code?: string }).code;
    if (
      itensCode === '42501' ||
      String(itensErr.message ?? '').toLowerCase().includes('permission denied')
    ) {
      return { success: false, error: ORDEM_DIARIA_PERMISSION_MSG };
    }
    console.error('getOrdemProducaoDiariaByDate itens', serializeSupabaseError(itensErr));
    return { success: false, error: itensErr.message };
  }

  type DiariaItemRow = {
    id: string;
    prioridade: number;
    produto_id: string;
    tipo_lata: string;
    latas_planejadas: number;
    caixas_estimadas: number;
    tipo_caixa_embalagem_id?: string | null;
    clientes: unknown;
    data_producao_override: string | null;
    data_etiqueta_override: string | null;
    observacao: string | null;
    observacao_embalagem?: string | null;
    observacao_producao?: string | null;
    status_linha: string | null;
    ordens_producao_id: string | null;
    ordens_producao: { lote_codigo: string | null } | { lote_codigo: string | null }[] | null;
    produtos: { nome?: string | null } | null;
    tipos_caixa_embalagem?:
      | {
          id?: string;
          nome?: string | null;
          unidades_por_caixa?: number | null;
          clientes?: { nome_fantasia?: string | null } | { nome_fantasia?: string | null }[] | null;
        }
      | {
          id?: string;
          nome?: string | null;
          unidades_por_caixa?: number | null;
          clientes?: { nome_fantasia?: string | null } | { nome_fantasia?: string | null }[] | null;
        }[]
      | null;
  };

  let itens: OrdemProducaoDiariaItemView[] = (itensRows ?? []).map((row) => {
    const r = row as DiariaItemRow;
    const clientes = Array.isArray(r.clientes)
      ? r.clientes.map((x) => String(x)).filter(Boolean)
      : [];
    const produtoNome = ((r.produtos as { nome?: string } | null)?.nome ?? '').trim();
    const opEmbed = r.ordens_producao;
    const opOne = Array.isArray(opEmbed) ? opEmbed[0] : opEmbed;
    const rawLote = opOne?.lote_codigo;
    const loteCodigo =
      rawLote != null && String(rawLote).trim() !== '' ? String(rawLote).trim() : null;
    const tcIdRaw = r.tipo_caixa_embalagem_id;
    const tipoCaixaEmbalagemId =
      tcIdRaw != null && String(tcIdRaw).trim() !== '' ? String(tcIdRaw).trim() : null;
    const tcEmb = r.tipos_caixa_embalagem;
    const tcOne = Array.isArray(tcEmb) ? tcEmb[0] : tcEmb;
    let tipoCaixaResumo: string | null = null;
    if (tcOne?.nome != null && String(tcOne.nome).trim() !== '') {
      const cn = tcOne.clientes;
      const c1 = Array.isArray(cn) ? cn[0] : cn;
      const clienteNome = String(c1?.nome_fantasia ?? '').trim();
      tipoCaixaResumo = clienteNome
        ? `${String(tcOne.nome).trim()} (${clienteNome})`
        : String(tcOne.nome).trim();
    }
    const embRaw = r.observacao_embalagem != null ? String(r.observacao_embalagem).trim() : '';
    const proRaw =
      r.observacao_producao != null && String(r.observacao_producao).trim() !== ''
        ? String(r.observacao_producao).trim()
        : r.observacao != null && String(r.observacao).trim() !== ''
          ? String(r.observacao).trim()
          : '';
    return {
      id: r.id,
      prioridade: Number(r.prioridade ?? 0),
      produtoId: r.produto_id,
      produtoNome: produtoNome || 'Produto sem nome',
      tipoLata: r.tipo_lata,
      latasPlanejadas: Number(r.latas_planejadas ?? 0),
      caixasEstimadas: Number(r.caixas_estimadas ?? 0),
      tipoCaixaEmbalagemId,
      tipoCaixaResumo,
      clientes,
      dataProducaoOverride: r.data_producao_override,
      dataEtiquetaOverride: r.data_etiqueta_override,
      observacaoEmbalagem: embRaw || null,
      observacaoProducao: proRaw || null,
      statusLinha: r.status_linha ?? 'rascunho',
      ordensProducaoId: r.ordens_producao_id ?? null,
      loteCodigo,
    };
  });

  return {
    success: true,
    data: {
      id: header.id,
      dataProducao: header.data_producao,
      dataEtiquetaDefault: header.data_etiqueta_default,
      status: header.status ?? 'rascunho',
      itens,
    },
  };
}
