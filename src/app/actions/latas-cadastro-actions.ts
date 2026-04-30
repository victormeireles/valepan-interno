'use server';

import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { revalidatePath } from 'next/cache';

const PATH = '/produtos/latas';

function serializeSupabaseError(error: unknown): Record<string, unknown> {
  if (error == null) return { kind: 'null' };
  if (typeof error !== 'object') return { kind: typeof error, value: String(error) };
  const o = error as Record<string, unknown>;
  return {
    message: o.message,
    code: o.code,
    details: o.details,
    hint: o.hint,
    ownKeys: Object.getOwnPropertyNames(error),
  };
}

function logSupabaseError(context: string, error: unknown): void {
  console.error(context, serializeSupabaseError(error));
}

export type VinculoProdutoAssadeira = {
  assadeira_id: string;
  nome: string;
  ordem: number;
  unidades_por_assadeira: number;
};

export type ProdutoLatasRow = {
  id: string;
  nome: string;
  codigo: string;
  unidades_assadeira: number | null;
  vinculos: VinculoProdutoAssadeira[];
  latas_cadastro_conferido: boolean;
};

export type ClienteLatasRow = {
  id: string;
  nome_fantasia: string;
  razao_social: string;
  somente_lata_antiga: boolean;
  ativo: boolean | null;
};

/** Inclui produtos com ativo = true ou ativo nulo (bases antigas / legado). */
const PRODUTOS_ATIVOS_OR = 'ativo.eq.true,ativo.is.null';

async function fetchProdutoAssadeirasLinks(
  supabase: ReturnType<typeof supabaseClientFactory.createServiceRoleClient>,
  produtoIds: string[],
): Promise<Map<string, VinculoProdutoAssadeira[]> | null> {
  if (produtoIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('produto_assadeiras')
    .select('produto_id, unidades_por_assadeira, assadeira_id')
    .in('produto_id', produtoIds);

  if (error) {
    logSupabaseError('getProdutosLatas produto_assadeiras', error);
    return null;
  }

  const assIds = [
    ...new Set(
      (data ?? [])
        .map((r) => (r as { assadeira_id?: string }).assadeira_id)
        .filter((id): id is string => Boolean(id && String(id).trim())),
    ),
  ];
  const assById = new Map<string, { id: string; nome: string; ordem: number }>();
  if (assIds.length > 0) {
    const { data: assRows, error: assErr } = await supabase
      .from('assadeiras')
      .select('id, nome, ordem')
      .in('id', assIds);
    if (assErr) {
      logSupabaseError('getProdutosLatas assadeiras', assErr);
    } else {
      for (const a of assRows ?? []) {
        assById.set(a.id, { id: a.id, nome: a.nome, ordem: a.ordem });
      }
    }
  }

  const map = new Map<string, VinculoProdutoAssadeira[]>();
  for (const row of data ?? []) {
    const pr = row as {
      produto_id: string;
      unidades_por_assadeira: number;
      assadeira_id: string;
    };
    const a = assById.get(pr.assadeira_id);
    if (!a) continue;
    const list = map.get(pr.produto_id) ?? [];
    list.push({
      assadeira_id: a.id,
      nome: a.nome,
      ordem: a.ordem,
      unidades_por_assadeira: pr.unidades_por_assadeira,
    });
    map.set(pr.produto_id, list);
  }
  for (const list of map.values()) {
    list.sort((x, y) => x.ordem - y.ordem || x.nome.localeCompare(y.nome));
  }
  return map;
}

type ProdutoLatasDbPartial = {
  id: string;
  nome: string;
  codigo: string;
  unidades_assadeira?: number | null;
  latas_cadastro_conferido?: boolean | null;
};

export async function getProdutosLatas(): Promise<ProdutoLatasRow[]> {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  const fullSelect = 'id, nome, codigo, unidades_assadeira, latas_cadastro_conferido';

  const first = await supabase
    .from('produtos')
    .select(fullSelect)
    .or(PRODUTOS_ATIVOS_OR)
    .order('nome');

  let data = first.data;
  const { error } = first;

  if (error) {
    const retry = await supabase
      .from('produtos')
      .select('id, nome, codigo, unidades_assadeira')
      .or(PRODUTOS_ATIVOS_OR)
      .order('nome');
    if (retry.error) {
      console.error('getProdutosLatas (falha no select completo e no retry)', {
        selectCompleto: serializeSupabaseError(error),
        selectSemConferido: serializeSupabaseError(retry.error),
      });
      const minimal = await supabase
        .from('produtos')
        .select('id, nome, codigo')
        .or(PRODUTOS_ATIVOS_OR)
        .order('nome');
      if (minimal.error) {
        logSupabaseError('getProdutosLatas (id/nome/código)', minimal.error);
        return [];
      }
      const minimalRows = (minimal.data ?? []) as ProdutoLatasDbPartial[];
      const idsM = minimalRows.map((r) => r.id);
      const linksMapM = await fetchProdutoAssadeirasLinks(supabase, idsM);
      return minimalRows.map((row) => ({
        id: row.id,
        nome: row.nome,
        codigo: row.codigo,
        unidades_assadeira: null,
        vinculos: linksMapM?.get(row.id) ?? [],
        latas_cadastro_conferido: false,
      }));
    }
    data = retry.data as typeof data;
  }

  const rows = (data ?? []) as ProdutoLatasDbPartial[];
  const ids = rows.map((r) => r.id);
  const linksMap = await fetchProdutoAssadeirasLinks(supabase, ids);

  return rows.map((row) => {
    const r = row as {
      id: string;
      nome: string;
      codigo: string;
      unidades_assadeira?: number | null;
      latas_cadastro_conferido?: boolean | null;
    };
    return {
      id: r.id,
      nome: r.nome,
      codigo: r.codigo,
      unidades_assadeira: r.unidades_assadeira ?? null,
      vinculos: linksMap?.get(r.id) ?? [],
      latas_cadastro_conferido: r.latas_cadastro_conferido ?? false,
    };
  });
}

/** Persiste vínculos em produto_assadeiras e sincroniza produtos.unidades_assadeira (menor ordem entre as selecionadas). */
export async function saveProdutoLatasPermitidas(input: {
  produtoId: string;
  vinculos: { assadeiraId: string; unidadesPorAssadeira: number }[];
}): Promise<{ success: boolean; error?: string }> {
  const seen = new Set<string>();
  const limpos: { assadeiraId: string; unidadesPorAssadeira: number }[] = [];
  for (const v of input.vinculos) {
    if (seen.has(v.assadeiraId)) {
      return { success: false, error: 'Assadeira duplicada na lista.' };
    }
    seen.add(v.assadeiraId);
    const u = Math.round(v.unidadesPorAssadeira);
    if (!Number.isFinite(u) || u <= 0) {
      return {
        success: false,
        error: 'Informe um número inteiro maior que zero nas unidades por assadeira selecionada.',
      };
    }
    limpos.push({ assadeiraId: v.assadeiraId, unidadesPorAssadeira: u });
  }

  const supabase = supabaseClientFactory.createServiceRoleClient();

  const { error: delErr } = await supabase
    .from('produto_assadeiras')
    .delete()
    .eq('produto_id', input.produtoId);

  if (delErr) {
    logSupabaseError('saveProdutoLatasPermitidas delete', delErr);
    return {
      success: false,
      error:
        delErr.message.includes('does not exist') || delErr.message.includes('schema cache')
          ? 'Tabela produto_assadeiras não encontrada. Rode a migração ASSADEIRAS_CATALOGO no banco.'
          : delErr.message,
    };
  }

  if (limpos.length > 0) {
    const { error: insErr } = await supabase.from('produto_assadeiras').insert(
      limpos.map((v) => ({
        produto_id: input.produtoId,
        assadeira_id: v.assadeiraId,
        unidades_por_assadeira: v.unidadesPorAssadeira,
      })),
    );

    if (insErr) {
      logSupabaseError('saveProdutoLatasPermitidas insert', insErr);
      return { success: false, error: insErr.message };
    }
  }

  let primary: number | null = null;
  if (limpos.length > 0) {
    const { data: paRows, error: paErr } = await supabase
      .from('produto_assadeiras')
      .select('unidades_por_assadeira, assadeira_id')
      .eq('produto_id', input.produtoId);

    if (!paErr && paRows?.length) {
      const aidList = [
        ...new Set(
          paRows
            .map((r) => (r as { assadeira_id?: string }).assadeira_id)
            .filter((id): id is string => Boolean(id && String(id).trim())),
        ),
      ];
      const ordemByAss = new Map<string, number>();
      if (aidList.length > 0) {
        const { data: assRows } = await supabase.from('assadeiras').select('id, ordem').in('id', aidList);
        for (const a of assRows ?? []) {
          ordemByAss.set(a.id, a.ordem);
        }
      }
      const sorted = [...paRows].sort((a, b) => {
        const ra = a as { assadeira_id: string; unidades_por_assadeira: number };
        const rb = b as { assadeira_id: string; unidades_por_assadeira: number };
        const oa = ordemByAss.get(ra.assadeira_id) ?? 0;
        const ob = ordemByAss.get(rb.assadeira_id) ?? 0;
        return oa - ob;
      });
      primary = (sorted[0] as { unidades_por_assadeira?: number })?.unidades_por_assadeira ?? null;
    }
  }

  const { error: upErr } = await supabase
    .from('produtos')
    .update({
      unidades_assadeira: primary,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.produtoId);

  if (upErr) {
    logSupabaseError('saveProdutoLatasPermitidas produtos.unidades_assadeira', upErr);
    return { success: false, error: upErr.message };
  }

  revalidatePath(PATH);
  return { success: true };
}

export async function toggleProdutoLatasConferido(
  produtoId: string,
  conferido: boolean,
): Promise<{ success: boolean; error?: string }> {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  const { error } = await supabase
    .from('produtos')
    .update({
      latas_cadastro_conferido: conferido,
      updated_at: new Date().toISOString(),
    })
    .eq('id', produtoId);

  if (error) {
    logSupabaseError('toggleProdutoLatasConferido', error);
    return { success: false, error: error.message };
  }

  revalidatePath(PATH);
  return { success: true };
}

export async function getClientesLatas(): Promise<ClienteLatasRow[]> {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  const { data, error } = await supabase
    .from('clientes')
    .select('id, nome_fantasia, razao_social, somente_lata_antiga, ativo')
    .order('nome_fantasia');

  if (error) {
    const retry = await supabase
      .from('clientes')
      .select('id, nome_fantasia, razao_social, ativo')
      .order('nome_fantasia');
    if (retry.error) {
      logSupabaseError('getClientesLatas', retry.error);
      return [];
    }
    return (retry.data ?? []).map((row) => ({
      ...row,
      somente_lata_antiga: false,
    })) as ClienteLatasRow[];
  }

  return (data ?? []) as ClienteLatasRow[];
}

export async function updateClienteSomenteLataAntiga(
  clienteId: string,
  somenteLataAntiga: boolean,
): Promise<{ success: boolean; error?: string }> {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  const { error } = await supabase
    .from('clientes')
    .update({
      somente_lata_antiga: somenteLataAntiga,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clienteId);

  if (error) {
    logSupabaseError('updateClienteSomenteLataAntiga', error);
    return { success: false, error: error.message };
  }

  revalidatePath(PATH);
  return { success: true };
}

export type ClienteAssadeiraBloqueioRow = {
  assadeira_id: string;
  cliente_id: string;
};

export async function getClienteAssadeiraBloqueios(): Promise<ClienteAssadeiraBloqueioRow[]> {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  const { data, error } = await supabase.from('cliente_assadeira_bloqueios').select('assadeira_id, cliente_id');

  if (error) {
    logSupabaseError('getClienteAssadeiraBloqueios', error);
    return [];
  }

  return (data ?? []) as ClienteAssadeiraBloqueioRow[];
}

/** Substitui todos os bloqueios desta lata pelos `clienteIdsBloqueados` indicados. */
export async function saveAssadeiraClienteBloqueios(input: {
  assadeiraId: string;
  clienteIdsBloqueados: string[];
}): Promise<{ success: boolean; error?: string }> {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const aid = input.assadeiraId?.trim();
  if (!aid) {
    return { success: false, error: 'Lata inválida.' };
  }

  const { error: delErr } = await supabase.from('cliente_assadeira_bloqueios').delete().eq('assadeira_id', aid);

  if (delErr) {
    logSupabaseError('saveAssadeiraClienteBloqueios delete', delErr);
    return {
      success: false,
      error:
        delErr.message.includes('does not exist') || delErr.message.includes('schema cache')
          ? 'Tabela cliente_assadeira_bloqueios não encontrada. Rode a migração no banco.'
          : delErr.message,
    };
  }

  const uniq = [...new Set(input.clienteIdsBloqueados.map((x) => String(x).trim()).filter(Boolean))];
  if (uniq.length > 0) {
    const { error: insErr } = await supabase.from('cliente_assadeira_bloqueios').insert(
      uniq.map((cliente_id) => ({ cliente_id, assadeira_id: aid })),
    );
    if (insErr) {
      logSupabaseError('saveAssadeiraClienteBloqueios insert', insErr);
      return { success: false, error: insErr.message };
    }
  }

  revalidatePath(PATH);
  revalidatePath('/producao/fila');
  return { success: true };
}
