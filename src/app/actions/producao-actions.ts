'use server';

import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { revalidatePath } from 'next/cache';
import { isVinculoReceitaMassaAtiva } from '@/lib/utils/receita-massa-eligibility';
import { listCarrinhosDisponiveisForOrdemFromSnapshots } from '@/lib/utils/forno-carrinhos-disponiveis';
import { sumLatasFromFornoLogRows } from '@/lib/utils/forno-volume';
import { estoqueService } from '@/lib/services/estoque-service';
import type { EstoqueRecord, Quantidade } from '@/domain/types/inventario';
import {
  quantidadePlanejadaParaUnidadesConsumo,
  unidadesConsumoParaQuantidadePlanejada,
  quantidadeEstoqueParaUnidadesConsumo,
  type ProductConversionInfo,
} from '@/lib/utils/production-conversions';
import { formatIntegerWithThousands, formatNumberWithThousands } from '@/lib/utils/number-utils';
import { isGoogleServiceAccountConfigured } from '@/lib/googleSheets';
import { ORDEM_PRODUCAO_TIPOS_LATA, type OrdemProducaoTipoLata } from '@/domain/types/ordem-producao';
import type { Json } from '@/types/database';
import { normalizeToISODate } from '@/lib/utils/date-utils';
import { purgeExpiredTemporaryProductionOrders } from '@/lib/production/temporary-op-cleanup';
import { opTemporariasAllowedOnServer } from '@/config/op-temporarias';
import {
  insertOrdemProducaoForDiariaItem,
  updateOrdemProducaoForDiariaItem,
  type DiariaHeaderDates,
} from '@/lib/production/ordem-producao-op-sync';
import { appendFileSync } from 'node:fs';
import { join } from 'node:path';

/** Debug session 8fe30e — NDJSON local + ingest (sem segredos). */
function agentDebugLogOrdemDiaria(payload: Record<string, unknown>) {
  const body = { sessionId: '8fe30e', timestamp: Date.now(), runId: 'debug-ordem-diaria', ...payload };
  const line = `${JSON.stringify(body)}\n`;
  try {
    appendFileSync(join(process.cwd(), 'debug-8fe30e.log'), line, 'utf8');
  } catch {
    /* ignore */
  }
  fetch('http://127.0.0.1:7700/ingest/15090b9f-dfae-41a9-a6f7-fe765ce88323', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '8fe30e' },
    body: JSON.stringify(body),
  }).catch(() => {});
}

const PATH_PRODUCAO_ORDEM_DIARIA = '/producao/ordem-producao';

interface CreateProductionOrderParams {
  produtoId: string;
  qtdPlanejada: number;
  pedidoId?: string;
  prioridade?: number; // 0=Normal, 1=Alta, 2=Urgente
  dataProducao?: string;
  /** Assadeira permitida em `produto_assadeiras`; null = inferir na fila pelo cadastro do produto. */
  assadeiraId?: string | null;
  /** Se true, OP de teste removida após o fim do dia da data de produção (Brasília). */
  temporaria?: boolean;
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
  const { data, error } = await supabase
    .from('produto_assadeiras')
    .select(
      `
      unidades_por_assadeira,
      assadeiras ( id, nome, ordem )
    `,
    )
    .eq('produto_id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  const out: AssadeiraOpcaoOrdemProducao[] = [];
  for (const row of data ?? []) {
    const a = row.assadeiras as { id: string; nome: string; ordem: number } | null;
    if (!a?.id) continue;
    const u = Math.round(Number(row.unidades_por_assadeira));
    if (!Number.isFinite(u) || u <= 0) continue;
    out.push({
      id: a.id,
      nome: (a.nome ?? '').trim() || '—',
      ordem: a.ordem ?? 0,
      unidades_por_assadeira: u,
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
    const isTemp = opTemporariasAllowedOnServer() && Boolean(params.temporaria);
    // 1. Gerar código do lote (OP-YYYYMMDD-Sequence ou OP-T-YYYYMMDD-Sequence para teste)
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const lotePrefix = isTemp ? `OP-T-${dateStr}-` : `OP-${dateStr}-`;

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
      const seqPart = isTemp ? parts[3] : parts[2];
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

    const dataProducaoIsoDate = normalizeToISODate(params.dataProducao);

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
        temporaria: isTemp,
        temporaria_expira_em: isTemp ? dataProducaoIsoDate : null,
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
      .select('pedido_id, temporaria')
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

    const opTemp = Boolean((ordemPed as { temporaria?: boolean | null } | null)?.temporaria);
    if (opTemporariasAllowedOnServer() && opTemp && params.dataProducao) {
      updateData.temporaria_expira_em = normalizeToISODate(params.dataProducao);
    }

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

/** Linha produto↔receita + metadados de `receitas` (sem embed PostgREST: evita PGRST200 se o hint de FK divergir). */
type ProdutoReceitaMassaLinkRow = {
  produto_id: string;
  quantidade_por_produto: number;
  tipo?: string | null;
  receitas?: { tipo?: string; ativo?: boolean | null } | null;
};

async function loadProdutoReceitasMassaLinkRows(
  supabase: ReturnType<typeof supabaseClientFactory.createServiceRoleClient>,
  produtoIds: string[],
): Promise<{ rows: ProdutoReceitaMassaLinkRow[]; error: unknown | null }> {
  if (produtoIds.length === 0) return { rows: [], error: null };

  const { data: linksRows, error: linksErr } = await supabase
    .from('produto_receitas')
    .select('produto_id, quantidade_por_produto, receita_id')
    .in('produto_id', produtoIds)
    .eq('ativo', true);

  if (linksErr) {
    return { rows: [], error: linksErr };
  }

  const receitaIds = [
    ...new Set(
      (linksRows ?? [])
        .map((r) => String((r as { receita_id?: string | null }).receita_id ?? '').trim())
        .filter(Boolean),
    ),
  ];

  if (receitaIds.length === 0) {
    const rows: ProdutoReceitaMassaLinkRow[] = (linksRows ?? []).map((link) => {
      const l = link as { produto_id: string; quantidade_por_produto: number };
      return {
        produto_id: l.produto_id,
        quantidade_por_produto: Number(l.quantidade_por_produto),
        receitas: null,
      };
    });
    return { rows, error: null };
  }

  const { data: recRows, error: recErr } = await supabase
    .from('receitas')
    .select('id, tipo, ativo')
    .in('id', receitaIds);

  if (recErr) {
    return { rows: [], error: recErr };
  }

  const receitaById = new Map<string, { tipo?: string; ativo?: boolean | null }>();
  for (const row of recRows ?? []) {
    const r = row as { id: string; tipo?: string; ativo?: boolean | null };
    receitaById.set(r.id, { tipo: r.tipo, ativo: r.ativo });
  }

  const rows: ProdutoReceitaMassaLinkRow[] = (linksRows ?? []).map((link) => {
    const l = link as { produto_id: string; quantidade_por_produto: number; receita_id: string };
    return {
      produto_id: l.produto_id,
      quantidade_por_produto: Number(l.quantidade_por_produto),
      receitas: receitaById.get(l.receita_id) ?? null,
    };
  });

  return { rows, error: null };
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

  const purgeResult = await purgeExpiredTemporaryProductionOrders(supabase);
  if (!purgeResult.ok) {
    console.warn('[fila] Limpeza OP temporárias:', purgeResult.error);
  }

  // Sem embed por hint de FK: no schema `interno` o nome da constraint pode não coincidir com o gerado
  // (PGRST200). Buscamos ordens, produtos e pedidos/clientes em consultas separadas e montamos o mesmo formato.
  const { data: ordensRows, error } = await supabase
    .from('ordens_producao')
    .select('*')
    .neq('status', 'concluido')
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
    ...new Set(ordensTyped.map((r) => String(r.produto_id ?? '').trim()).filter(Boolean)),
  ];
  const pedidoIds = [
    ...new Set(
      ordensTyped
        .map((r) => r.pedido_id)
        .filter((id): id is string => Boolean(id && String(id).trim())),
    ),
  ];

  type ProdutoJoinRow = {
    nome: string;
    package_units?: number | null;
    box_units?: number | null;
    unidades_assadeira?: number | null;
    unidades_lata_antiga?: number | null;
    unidades_lata_nova?: number | null;
    unidade_padrao_id?: string | null;
    unidades?: { nome_resumido?: string } | null;
    [key: string]: unknown;
  };
  const produtosJoin = new Map<string, ProdutoJoinRow>();

  if (ordemProdutoIds.length > 0) {
    const SELECT_PRODUTOS_COM_LATA =
      'id, nome, unidade_padrao_id, package_units, box_units, unidades_assadeira, unidades_lata_antiga, unidades_lata_nova';
    const SELECT_PRODUTOS_SEM_LATA =
      'id, nome, unidade_padrao_id, package_units, box_units, unidades_assadeira';

    let pRows: unknown[] | null = null;
    let pErr: unknown = null;

    const firstProd = await supabase
      .from('produtos')
      .select(SELECT_PRODUTOS_COM_LATA)
      .in('id', ordemProdutoIds);
    pErr = firstProd.error;
    pRows = firstProd.data as unknown[] | null;

    if (pErr && isProdutosUnidadesLataColumnsMissing(pErr)) {
      const secondProd = await supabase
        .from('produtos')
        .select(SELECT_PRODUTOS_SEM_LATA)
        .in('id', ordemProdutoIds);
      pErr = secondProd.error;
      pRows = secondProd.data as unknown[] | null;
    }

    if (pErr) {
      console.error(
        'Erro ao buscar fila (produtos):',
        JSON.stringify(serializeSupabaseError(pErr as unknown)),
      );
    } else {
      const uid = [
        ...new Set(
          (pRows ?? [])
            .map((r) => (r as { unidade_padrao_id?: string | null }).unidade_padrao_id)
            .filter((id): id is string => Boolean(id && String(id).trim())),
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
      for (const pr of (pRows ?? []) as {
        id: string;
        nome: string;
        unidade_padrao_id?: string | null;
        package_units?: number | null;
        box_units?: number | null;
        unidades_assadeira?: number | null;
        unidades_lata_antiga?: number | null;
        unidades_lata_nova?: number | null;
      }[]) {
        const up = pr.unidade_padrao_id?.trim();
        const nr = up ? unNome.get(up) : undefined;
        produtosJoin.set(pr.id, {
          nome: pr.nome,
          unidade_padrao_id: pr.unidade_padrao_id ?? null,
          package_units: pr.package_units ?? null,
          box_units: pr.box_units ?? null,
          unidades_assadeira: pr.unidades_assadeira ?? null,
          unidades_lata_antiga: pr.unidades_lata_antiga ?? null,
          unidades_lata_nova: pr.unidades_lata_nova ?? null,
          unidades: nr != null && nr !== '' ? { nome_resumido: nr } : { nome_resumido: '' },
        });
      }
    }
  }

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
    const pid = String(row.produto_id ?? '').trim();
    const pedId =
      row.pedido_id != null && String(row.pedido_id).trim() !== ''
        ? String(row.pedido_id).trim()
        : null;
    return {
      ...row,
      produtos: pid ? produtosJoin.get(pid) ?? null : null,
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
      .select(
        `
        produto_id,
        unidades_por_assadeira,
        assadeiras ( id, nome, ordem )
      `,
      )
      .in('produto_id', produtoIds);

    if (paError) {
      console.error('Erro ao buscar latas por produto (fila):', serializeSupabaseError(paError));
    } else {
      for (const row of (paData ?? []) as {
        produto_id: string;
        unidades_por_assadeira: number | string | null;
        assadeiras: { id: string; nome: string; ordem: number } | null;
      }[]) {
        const aid = row.assadeiras?.id?.trim();
        const nome = row.assadeiras?.nome?.trim();
        if (!aid || !nome) continue;
        const ordem = row.assadeiras?.ordem ?? 0;
        const u = Math.round(Number(row.unidades_por_assadeira));
        if (!Number.isFinite(u) || u <= 0) continue;
        const list = linksByProduto.get(row.produto_id) ?? [];
        list.push({ assadeira_id: aid, unidades: u, nome, ordem });
        linksByProduto.set(row.produto_id, list);
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
    ordem_producao_id: string;
    dados_qualidade: unknown;
    qtd_saida: number | null;
  };
  const { data: fornoLogsTodasEntradas } = await supabase
    .from('producao_etapas_log')
    .select('ordem_producao_id, dados_qualidade, qtd_saida')
    .eq('etapa', 'entrada_forno')
    .in('ordem_producao_id', orderIds);

  const fornoLogsByOrdem = new Map<string, FornoEntradaRow[]>();
  for (const row of (fornoLogsTodasEntradas ?? []) as FornoEntradaRow[]) {
    const list = fornoLogsByOrdem.get(row.ordem_producao_id) ?? [];
    list.push(row);
    fornoLogsByOrdem.set(row.ordem_producao_id, list);
  }

  const { data: saidaFornoLogsConcluidos } = await supabase
    .from('producao_etapas_log')
    .select('ordem_producao_id, dados_qualidade')
    .eq('etapa', 'saida_forno')
    .not('fim', 'is', null)
    .in('ordem_producao_id', orderIds);

  const saidaBandejasByOrdem = new Map<string, number>();
  for (const row of saidaFornoLogsConcluidos ?? []) {
    const dq = row.dados_qualidade as { bandejas?: number } | null;
    const b = dq?.bandejas;
    if (b != null && !Number.isNaN(Number(b))) {
      const oid = row.ordem_producao_id as string;
      saidaBandejasByOrdem.set(oid, (saidaBandejasByOrdem.get(oid) || 0) + Number(b));
    }
  }

  const { data: entradaEmbalagemLogsConcluidos } = await supabase
    .from('producao_etapas_log')
    .select('ordem_producao_id, qtd_saida, dados_qualidade')
    .eq('etapa', 'entrada_embalagem')
    .not('fim', 'is', null)
    .in('ordem_producao_id', orderIds);

  const entradaEmbalagemLatasByOrdem = new Map<string, number>();
  /** Um registro concluído na entrada da embalagem = um lote/carrinho contabilizado na fila. */
  const entradaEmbalagemRegistrosByOrdem = new Map<string, number>();
  for (const row of entradaEmbalagemLogsConcluidos ?? []) {
    const oid = row.ordem_producao_id as string;
    entradaEmbalagemRegistrosByOrdem.set(oid, (entradaEmbalagemRegistrosByOrdem.get(oid) || 0) + 1);
    const dq = row.dados_qualidade as { assadeiras?: number } | null;
    let latas = 0;
    if (row.qtd_saida != null && !Number.isNaN(Number(row.qtd_saida))) {
      latas = Number(row.qtd_saida);
    } else if (dq?.assadeiras != null && !Number.isNaN(Number(dq.assadeiras))) {
      latas = Number(dq.assadeiras);
    }
    if (latas <= 0) continue;
    entradaEmbalagemLatasByOrdem.set(oid, (entradaEmbalagemLatasByOrdem.get(oid) || 0) + latas);
  }

  const { data: saidaEmbalagemLogs } = await supabase
    .from('producao_etapas_log')
    .select('ordem_producao_id, inicio, dados_qualidade')
    .eq('etapa', 'saida_embalagem')
    .in('ordem_producao_id', orderIds);

  type SaidaEmbLogRow = { ordem_producao_id: string; inicio: string; dados_qualidade: unknown };
  const saidaEmbalagemCaixasPorOrdem = new Map<string, { inicio: string; caixas: number }>();
  for (const raw of saidaEmbalagemLogs ?? []) {
    const row = raw as SaidaEmbLogRow;
    const oid = String(row.ordem_producao_id ?? '');
    const inicio = String(row.inicio ?? '');
    const dq = row.dados_qualidade as { caixas_recebidas?: number } | null;
    const cr = dq?.caixas_recebidas;
    if (cr == null || !Number.isFinite(Number(cr))) continue;
    const caixas = Math.round(Number(cr));
    const prev = saidaEmbalagemCaixasPorOrdem.get(oid);
    if (!prev || new Date(inicio).getTime() >= new Date(prev.inicio).getTime()) {
      saidaEmbalagemCaixasPorOrdem.set(oid, { inicio, caixas });
    }
  }

  // Buscar logs de fermentação concluídos (soma de todos os lotes por OP)
  const { data: fermentacaoLogs } = await supabase
    .from('producao_etapas_log')
    .select('id, ordem_producao_id, qtd_saida, dados_qualidade')
    .eq('etapa', 'fermentacao')
    .not('fim', 'is', null)
    .in('ordem_producao_id', orderIds);

  type FermentacaoLogRow = {
    id: string;
    ordem_producao_id: string;
    qtd_saida: number | null;
    dados_qualidade: unknown;
  };

  /** Volume concluído na fermentação: LT se houver unidades_assadeira (+ assadeiras_lt preferencial); senão unidades (qtd_saida). */
  const fermentacaoVolumeMap = new Map<string, number>();
  const receitasFermentacaoMap = new Map<string, number>();
  type CarrinhoFerm = { log_id: string; carrinho: string; latas: number };
  const fermentacaoCarrinhosMap = new Map<string, CarrinhoFerm[]>();
  fermentacaoLogs?.forEach((log: FermentacaoLogRow) => {
    const ordemId = log.ordem_producao_id;
    const row = data.find((i: OrdemProducaoItem) => i.id === ordemId) as OrdemProducaoWithProduto | undefined;
    const ua = row?.produtos?.unidades_assadeira;
    const uaNum = ua != null && Number(ua) > 0 ? Number(ua) : null;
    const dq = log.dados_qualidade as { assadeiras_lt?: number; numero_carrinho?: string } | null | undefined;

    let volume = 0;
    if (uaNum != null) {
      const lt = dq?.assadeiras_lt;
      if (lt != null && !Number.isNaN(Number(lt))) {
        volume = Number(lt);
      } else if (log.qtd_saida != null && !Number.isNaN(Number(log.qtd_saida))) {
        volume = Number(log.qtd_saida) / uaNum;
      }
    } else if (log.qtd_saida != null && !Number.isNaN(Number(log.qtd_saida))) {
      volume = Number(log.qtd_saida);
    }

    fermentacaoVolumeMap.set(ordemId, (fermentacaoVolumeMap.get(ordemId) || 0) + volume);

    const carrinho = dq?.numero_carrinho?.trim() || '—';
    const entry: CarrinhoFerm = { log_id: log.id, carrinho, latas: volume };
    const lista = fermentacaoCarrinhosMap.get(ordemId) || [];
    lista.push(entry);
    fermentacaoCarrinhosMap.set(ordemId, lista);

    if (row && log.qtd_saida != null && !Number.isNaN(Number(log.qtd_saida))) {
      const receitaMassa = receitasMap.get(row.produto_id);
      if (receitaMassa && receitaMassa.quantidade_por_produto > 0) {
        const rec = Number(log.qtd_saida) / receitaMassa.quantidade_por_produto;
        receitasFermentacaoMap.set(ordemId, (receitasFermentacaoMap.get(ordemId) || 0) + rec);
      }
    }
  });

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
  if (assadeiraIdsDasOrdens.length > 0) {
    const { data: anRows, error: anErr } = await supabase
      .from('assadeiras')
      .select('id, nome')
      .in('id', assadeiraIdsDasOrdens);
    if (anErr) {
      console.warn(
        '[fila] assadeiras (nome na OP):',
        JSON.stringify(serializeSupabaseError(anErr)),
      );
    } else {
      for (const r of anRows ?? []) {
        const row = r as { id: string; nome: string };
        nomeAssadeiraPorId.set(row.id, (row.nome ?? '').trim() || '—');
      }
    }
  }

  // Transformar os dados para incluir receita_massa, receitas_batidas e receitas_fermentacao no formato esperado
  const transformedData = (data as OrdemProducaoWithProduto[]).map((item) => {
    const produto = item.produtos;
    const receitaMassa = receitasMap.get(item.produto_id) || null;
    const receitasBatidas = receitasBatidasMap.get(item.id) || 0;
    const receitasFermentacao = receitasFermentacaoMap.get(item.id) || 0;
    const fermentacao_volume_concluido = fermentacaoVolumeMap.get(item.id) || 0;
    const forno_volume_concluido = fornoVolumeMap.get(item.id) || 0;
    const fermentacao_carrinhos = fermentacaoCarrinhosMap.get(item.id) || [];
    const qtdMassaFinalizada = receitasBatidas > 0 ? receitasBatidas : null;

    // Extrair nome_resumido do join com unidades
    const unidades = produto?.unidades as { nome_resumido?: string } | null;
    const unidadeNomeResumido = unidades?.nome_resumido || null;

    const produtoJoinFaltando = produto == null;

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

    const necessidadeConsumo = quantidadePlanejadaParaUnidadesConsumo(item.qtd_planejada, productInfo);
    const aProduzirConsumo = Math.max(0, necessidadeConsumo - estoque_unidades_consumo);
    const qtd_a_produzir_planejada = unidadesConsumoParaQuantidadePlanejada(
      aProduzirConsumo,
      productInfo,
    );

    const uaForDisp =
      produto?.unidades_assadeira != null && Number(produto.unidades_assadeira) > 0
        ? Number(produto.unidades_assadeira)
        : null;

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
    const saida_forno_bandejas_total = saidaBandejasByOrdem.get(item.id) || 0;
    const entrada_embalagem_latas_total = entradaEmbalagemLatasByOrdem.get(item.id) || 0;
    const entrada_embalagem_registros_count = entradaEmbalagemRegistrosByOrdem.get(item.id) || 0;
    const saida_embalagem_caixas_informadas =
      saidaEmbalagemCaixasPorOrdem.get(item.id)?.caixas ?? null;

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
      produtos: {
        ...produto,
        nome: produto?.nome || (produtoJoinFaltando ? 'Produto não encontrado' : 'Produto sem nome'),
        unidadeNomeResumido,
        receita_massa: receitaMassa,
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
      saida_forno_bandejas_total,
      entrada_embalagem_latas_total,
      entrada_embalagem_registros_count,
      saida_embalagem_caixas_informadas,
      qtd_massa_finalizada: qtdMassaFinalizada,
      estoque_resumo,
      estoque_unidades_consumo,
      qtd_a_produzir_planejada,
      lata_tipo_nome,
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
  unidades_lata_antiga: number | null;
  unidades_lata_nova: number | null;
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
      unidades_lata_antiga: row.unidades_lata_antiga,
      unidades_lata_nova: row.unidades_lata_nova,
      receita_massa: receita ?? null,
    },
  };
}

const PRODUTO_AUTOCOMPLETE_SELECT = `
  id,
  nome,
  codigo,
  unidade_padrao_id,
  package_units,
  box_units,
  unidades_assadeira,
  unidades_lata_antiga,
  unidades_lata_nova
`;

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
  if (q.length < 1) {
    return { success: true as const, options: [] as ProdutoAutocompleteOption[] };
  }

  const pattern = postgrestQuotedValue(`%${q}%`);
  const { data, error } = await supabase
    .from('produtos')
    .select(PRODUTO_AUTOCOMPLETE_SELECT)
    .eq('ativo', true)
    .or(`nome.ilike.${pattern},codigo.ilike.${pattern}`)
    .order('nome', { ascending: true })
    .limit(25);

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

  const { data, error } = await supabase
    .from('produtos')
    .select(PRODUTO_AUTOCOMPLETE_SELECT)
    .eq('id', id)
    .maybeSingle();

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
  return (
    m.includes('ordens_producao_diarias') &&
    (m.includes('does not exist') || m.includes('schema cache') || m.includes('could not find'))
  );
}

const ORDEM_DIARIA_ESTRUTURA_FALTANDO_MSG =
  'Estrutura da ordem diária ainda não está disponível no banco. Aplique a migração sql/MIGRACAO_OFICIAL_ORDEM_DIARIA_OP_INTERNO.sql.';

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
): Promise<{ success: true; ordemId: string } | { success: false; error: string }> {
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
      return { success: false, error: 'Já existe ordem para esta data de produção.' };
    }
    console.error('createOrdemProducaoDiaria', serializeSupabaseError(error));
    return { success: false, error: error.message };
  }

  revalidatePath(PATH_PRODUCAO_ORDEM_DIARIA);
  return { success: true, ordemId: data!.id };
}

export type UpsertOrdemProducaoItemInput = {
  ordemId: string;
  itemId?: string;
  prioridade?: number;
  produtoId: string;
  tipoLata: OrdemProducaoTipoLata;
  latasPlanejadas: number;
  caixasEstimadas: number;
  clientes: string[];
  dataProducaoOverride?: string | null;
  dataEtiquetaOverride?: string | null;
  observacao?: string | null;
  statusLinha?: string;
};

export async function upsertOrdemProducaoItem(
  input: UpsertOrdemProducaoItemInput,
): Promise<{ success: true; itemId: string } | { success: false; error: string }> {
  const ordemId = input.ordemId?.trim();
  if (!ordemId) return { success: false, error: 'Ordem inválida.' };
  const produtoId = input.produtoId?.trim();
  if (!produtoId) return { success: false, error: 'Produto inválido.' };
  const tipoLata = input.tipoLata;
  if (!(ORDEM_PRODUCAO_TIPOS_LATA as readonly string[]).includes(tipoLata)) {
    return { success: false, error: 'Tipo de lata inválido.' };
  }
  const latasPlanejadas = Math.round(Number(input.latasPlanejadas));
  if (!Number.isFinite(latasPlanejadas) || latasPlanejadas < 0) {
    return { success: false, error: 'Latas planejadas inválidas.' };
  }
  const caixasEstimadas = Math.round(Number(input.caixasEstimadas));
  if (!Number.isFinite(caixasEstimadas) || caixasEstimadas < 0) {
    return { success: false, error: 'Caixas estimadas inválidas.' };
  }

  const supabase = supabaseClientFactory.createServiceRoleClient();

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
  const obs = input.observacao?.trim() ? input.observacao.trim().slice(0, 500) : null;

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
      tipo_lata: OrdemProducaoTipoLata;
      latas_planejadas: number;
      caixas_estimadas: number;
      clientes: Json;
      observacao: string | null;
      status_linha: (typeof ORDENS_PRODUCAO_DIARIAS_LINHA_STATUSES)[number];
      updated_at: string;
      prioridade?: number;
      data_producao_override?: string | null;
      data_etiqueta_override?: string | null;
    } = {
      produto_id: produtoId,
      tipo_lata: tipoLata,
      latas_planejadas: latasPlanejadas,
      caixas_estimadas: caixasEstimadas,
      clientes: clientesJson,
      observacao: obs,
      status_linha: statusLinha,
      updated_at: new Date().toISOString(),
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

    const { error: upErr } = await supabase
      .from('ordens_producao_diarias_itens')
      .update(updateRow)
      .eq('id', itemId)
      .eq('ordem_diaria_id', ordemId);

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
    clientes: clientesJson,
    data_producao_override: dataProdOverrideResolved ?? null,
    data_etiqueta_override: dataEtiOverrideResolved ?? null,
    observacao: obs,
    status_linha: statusLinha,
  };

  const { data: inserted, error: insErr } = await supabase
    .from('ordens_producao_diarias_itens')
    .insert(insertRow)
    .select('id')
    .single();

  if (insErr) {
    if (isMissingOrdemDiariaTableError(insErr.message)) {
      return {
        success: false,
        error: ORDEM_DIARIA_ESTRUTURA_FALTANDO_MSG,
      };
    }
    console.error('upsertOrdemProducaoItem insert', serializeSupabaseError(insErr));
    return { success: false, error: insErr.message };
  }

  const newItemId = inserted!.id;
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
  const { error } = await supabase
    .from('ordens_producao_diarias')
    .update({
      status: 'pronto',
      updated_at: new Date().toISOString(),
    })
    .eq('id', oid);

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
  clientes: string[];
  dataProducaoOverride: string | null;
  dataEtiquetaOverride: string | null;
  observacao: string | null;
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

/** Carrega a ordem diária por data (YYYY-MM-DD), com itens ordenados por prioridade. */
export async function getOrdemProducaoDiariaByDate(
  dataProducao: string,
): Promise<{ success: true; data: OrdemProducaoDiariaView | null } | { success: false; error: string }> {
  const date = normalizeOrdemDiariaDate(dataProducao);
  if (!date) {
    return { success: false, error: 'Data inválida.' };
  }
  // #region agent log
  {
    const sr = process.env.SERVICE_ROLE ?? '';
    const an = process.env.SUPABASE_ANON_KEY ?? '';
    agentDebugLogOrdemDiaria({
      hypothesisId: 'B',
      location: 'producao-actions.ts:getOrdemProducaoDiariaByDate:entry',
      message: 'env_fingerprint',
      data: {
        date,
        serviceRoleLen: sr.length,
        anonKeyLen: an.length,
        serviceRolePresent: sr.length > 0,
        keysIdentical: sr.length > 0 && sr === an,
        vercelEnv: process.env.VERCEL_ENV ?? null,
      },
    });
  }
  // #endregion
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const { data: header, error: headErr } = await supabase
    .from('ordens_producao_diarias')
    .select('id, data_producao, data_etiqueta_default, status')
    .eq('data_producao', date)
    .maybeSingle();

  if (headErr) {
    // #region agent log
    agentDebugLogOrdemDiaria({
      hypothesisId: 'A',
      location: 'producao-actions.ts:getOrdemProducaoDiariaByDate:header_err',
      message: 'header_query_failed',
      data: {
        code: (headErr as { code?: string }).code ?? null,
        msg: headErr.message,
        details: (headErr as { details?: string }).details ?? null,
        hint: (headErr as { hint?: string }).hint ?? null,
      },
    });
    // #endregion
    if (isMissingOrdemDiariaTableError(headErr.message)) {
      return {
        success: false,
        error: ORDEM_DIARIA_ESTRUTURA_FALTANDO_MSG,
      };
    }
    console.error('getOrdemProducaoDiariaByDate header', serializeSupabaseError(headErr));
    return { success: false, error: headErr.message };
  }
  if (!header) {
    // #region agent log
    agentDebugLogOrdemDiaria({
      hypothesisId: 'C',
      location: 'producao-actions.ts:getOrdemProducaoDiariaByDate:no_header',
      message: 'header_empty_ok',
      data: { date },
    });
    // #endregion
    return { success: true, data: null };
  }

  const { data: itensRows, error: itensErr } = await supabase
    .from('ordens_producao_diarias_itens')
    .select(`
      id,
      prioridade,
      produto_id,
      tipo_lata,
      latas_planejadas,
      caixas_estimadas,
      clientes,
      data_producao_override,
      data_etiqueta_override,
      observacao,
      status_linha,
      ordens_producao_id,
      ordens_producao ( lote_codigo ),
      produtos ( nome )
    `)
    .eq('ordem_diaria_id', header.id)
    .order('prioridade', { ascending: true });

  if (itensErr) {
    // #region agent log
    agentDebugLogOrdemDiaria({
      hypothesisId: 'C',
      location: 'producao-actions.ts:getOrdemProducaoDiariaByDate:itens_err',
      message: 'itens_query_failed',
      data: {
        headerId: header.id,
        code: (itensErr as { code?: string }).code ?? null,
        msg: itensErr.message,
        details: (itensErr as { details?: string }).details ?? null,
      },
    });
    // #endregion
    if (isMissingOrdemDiariaTableError(itensErr.message)) {
      return {
        success: false,
        error: ORDEM_DIARIA_ESTRUTURA_FALTANDO_MSG,
      };
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
    clientes: unknown;
    data_producao_override: string | null;
    data_etiqueta_override: string | null;
    observacao: string | null;
    status_linha: string | null;
    ordens_producao_id: string | null;
    ordens_producao: { lote_codigo: string | null } | { lote_codigo: string | null }[] | null;
    produtos: { nome?: string | null } | null;
  };

  const itens: OrdemProducaoDiariaItemView[] = (itensRows ?? []).map((row) => {
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
    return {
      id: r.id,
      prioridade: Number(r.prioridade ?? 0),
      produtoId: r.produto_id,
      produtoNome: produtoNome || 'Produto sem nome',
      tipoLata: r.tipo_lata,
      latasPlanejadas: Number(r.latas_planejadas ?? 0),
      caixasEstimadas: Number(r.caixas_estimadas ?? 0),
      clientes,
      dataProducaoOverride: r.data_producao_override,
      dataEtiquetaOverride: r.data_etiqueta_override,
      observacao: r.observacao,
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
