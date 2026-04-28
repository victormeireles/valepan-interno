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
    // 1. Gerar código do lote (OP-YYYYMMDD-Sequence)
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    
    // Busca última OP do dia para incrementar sequencial
    const { data: lastOp } = await supabase
      .from('ordens_producao')
      .select('lote_codigo')
      .ilike('lote_codigo', `OP-${dateStr}-%`)
      .order('lote_codigo', { ascending: false })
      .limit(1)
      .single();

    let sequence = 1;
    if (lastOp?.lote_codigo) {
      const parts = lastOp.lote_codigo.split('-');
      if (parts.length === 3) {
        sequence = parseInt(parts[2]) + 1;
      }
    }

    const loteCodigo = `OP-${dateStr}-${String(sequence).padStart(3, '0')}`;

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

/** Persiste a sequência do planejamento (1 = primeiro a produzir). Só ordens `planejado`. */
export async function reorderProductionPlanningOrders(orderedIds: string[]) {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  if (!orderedIds.length) {
    return { success: true as const };
  }

  try {
    const { data: rows, error: selErr } = await supabase
      .from('ordens_producao')
      .select('id, status')
      .in('id', orderedIds);

    if (selErr) throw selErr;
    if (!rows || rows.length !== orderedIds.length) {
      return {
        success: false as const,
        error: 'Algumas ordens não foram encontradas. Recarregue a página.',
      };
    }

    for (const r of rows) {
      const st = r.status ?? 'planejado';
      if (st !== 'planejado') {
        return {
          success: false as const,
          error: 'Só é possível reordenar ordens ainda em planejamento.',
        };
      }
    }

    const updates = orderedIds.map((id, index) =>
      supabase
        .from('ordens_producao')
        .update({ ordem_planejamento: index + 1 })
        .eq('id', id),
    );

    const results = await Promise.all(updates);
    for (const res of results) {
      if (res.error) throw res.error;
    }

    revalidatePath('/producao/fila');
    return { success: true as const };
  } catch (error) {
    console.error('Erro ao reordenar planejamento:', error);
    return {
      success: false as const,
      error: 'Não foi possível salvar a ordem de produção. Tente novamente.',
    };
  }
}

function serializeSupabaseError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    const anyErr = err as Error & {
      code?: string;
      details?: string;
      hint?: string;
    };
    return {
      name: err.name,
      message: err.message,
      code: anyErr.code,
      details: anyErr.details,
      hint: anyErr.hint,
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
    const hasText = Object.values(out).some((v) => v != null && String(v).trim() !== '');
    if (!hasText) {
      try {
        out.serialized = JSON.stringify(err);
      } catch {
        out.serialized = '[object]';
      }
    }
    return out;
  }
  return { raw: String(err) };
}

function formatEstoquePlanilhaResumo(q: Quantidade): string {
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

  // Hints de FK explícitos: views (ex.: vw_dashboard_producao) podem gerar ambiguidade no PostgREST
  // e retornar erro sem mensagem útil no cliente — ver postgrest#2277 / resource embedding disambiguation.
  const { data, error } = await supabase
    .from('ordens_producao')
    .select(`
      *,
      produtos!ordens_producao_produto_id_fkey (
        id,
        nome,
        unidade_padrao_id,
        package_units,
        box_units,
        unidades_assadeira,
        unidades!produtos_unidade_padrao_id_fkey (nome_resumido)
      ),
      pedidos!ordens_producao_pedido_id_fkey (
        cliente_id,
        clientes!pedidos_cliente_id_fkey (nome_fantasia)
      )
    `)
    .neq('status', 'concluido')
    .neq('status', 'cancelado');

  if (error) {
    console.error('Erro ao buscar fila:', serializeSupabaseError(error));
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Buscar receitas de massa para todos os produtos
  type OrdemProducaoItem = {
    id: string;
    produto_id: string;
    lote_codigo: string;
    qtd_planejada: number;
    [key: string]: unknown;
  };
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
    if (plErr) {
      console.warn(
        '[fila] produtos.unidades_lata_*:',
        JSON.stringify(serializeSupabaseError(plErr)),
      );
    } else {
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

  type ProdutoReceitaItem = {
    produto_id: string;
    quantidade_por_produto: number;
    tipo?: string | null;
    receitas?: {
      tipo?: string;
      ativo?: boolean | null;
    } | null;
  };

  let receitasVinculadas: ProdutoReceitaItem[] | null = null;
  if (produtoIds.length > 0) {
    // Hint explícito: evita ambiguidade com view vw_produtos_com_receitas (mesmo padrão da fila principal).
    // Não selecionar produto_receitas.tipo: em bases sem migração multitipo a coluna não existe;
    // isVinculoReceitaMassaAtiva usa receitas.tipo quando tipo do vínculo está ausente.
    const { data: receitasData, error: receitasError } = await supabase
      .from('produto_receitas')
      .select(`
        produto_id,
        quantidade_por_produto,
        receitas!produto_receitas_receita_id_fkey (
          tipo,
          ativo
        )
      `)
      .in('produto_id', produtoIds)
      .eq('ativo', true);

    if (receitasError) {
      console.error('Erro ao buscar receitas vinculadas:', serializeSupabaseError(receitasError));
    } else {
      receitasVinculadas = receitasData as unknown as ProdutoReceitaItem[];
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
  receitasVinculadas?.forEach((pr: ProdutoReceitaItem) => {
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
  for (const row of entradaEmbalagemLogsConcluidos ?? []) {
    const dq = row.dados_qualidade as { assadeiras?: number } | null;
    let latas = 0;
    if (row.qtd_saida != null && !Number.isNaN(Number(row.qtd_saida))) {
      latas = Number(row.qtd_saida);
    } else if (dq?.assadeiras != null && !Number.isNaN(Number(dq.assadeiras))) {
      latas = Number(dq.assadeiras);
    }
    if (latas <= 0) continue;
    const oid = row.ordem_producao_id as string;
    entradaEmbalagemLatasByOrdem.set(oid, (entradaEmbalagemLatasByOrdem.get(oid) || 0) + latas);
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
      console.error('Estoque (planilha) indisponível ao montar a fila:', msg);
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
        estoque_resumo = formatEstoquePlanilhaResumo(est.quantidade);
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

  type ProdutoReceitaItem = {
    produto_id: string;
    quantidade_por_produto: number;
    tipo?: string | null;
    receitas?: { tipo?: string; ativo?: boolean | null } | null;
  };

  const { data: receitasData, error: receitasError } = await supabase
    .from('produto_receitas')
    .select(
      `
        produto_id,
        quantidade_por_produto,
        receitas!produto_receitas_receita_id_fkey (
          tipo,
          ativo
        )
      `,
    )
    .in('produto_id', produtoIds)
    .eq('ativo', true);

  if (receitasError) {
    console.error('Erro ao buscar receitas (autocomplete produto):', serializeSupabaseError(receitasError));
    return map;
  }

  (receitasData as unknown as ProdutoReceitaItem[] | null)?.forEach((pr) => {
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
  unidades_lata_nova,
  unidades!produtos_unidade_padrao_id_fkey (nome_resumido)
`;

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
    console.error('searchProdutosParaAutocomplete:', serializeSupabaseError(error));
    return { success: false as const, options: [] as ProdutoAutocompleteOption[], error: 'Erro ao buscar produtos.' };
  }

  const rows = (data ?? []) as unknown as ProdutoRowForAutocomplete[];
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
    console.error('getProdutoAutocompleteOptionById:', serializeSupabaseError(error));
    return { success: false as const, option: null as ProdutoAutocompleteOption | null, error: 'Erro ao carregar produto.' };
  }

  if (!data) {
    return { success: true as const, option: null as ProdutoAutocompleteOption | null };
  }

  const row = data as unknown as ProdutoRowForAutocomplete;
  const receitasMap = await receitasMassaMapForProdutoIds(supabase, [row.id]);
  return { success: true as const, option: rowToAutocompleteOption(row, receitasMap) };
}
