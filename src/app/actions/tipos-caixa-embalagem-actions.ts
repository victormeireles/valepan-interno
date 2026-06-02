'use server';

import { revalidatePath } from 'next/cache';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type { Database } from '@/types/database';

const PATH = '/produtos/tipos-caixa';

type TipoRow = Database['interno']['Tables']['tipos_caixa_embalagem']['Row'];
type OverrideRow = Database['interno']['Tables']['produtos_tipos_caixa_embalagem']['Row'];

export type TipoCaixaEmbalagemListItem = {
  id: string;
  clienteId: string;
  clienteNome: string;
  nome: string;
  unidadesPorCaixa: number;
  ativo: boolean;
  observacao: string | null;
};

export type TipoCaixaOrdemOpcao = {
  id: string;
  nome: string;
  clienteNome: string;
  unidadesPorCaixa: number;
};

export type ProdutoTipoCaixaOverrideItem = {
  id: string;
  produtoId: string;
  produtoNome: string;
  produtoCodigo: string;
  boxUnitsOverride: number | null;
  packageUnitsOverride: number | null;
};

export type ClienteOpcaoTipoCaixa = { id: string; nomeFantasia: string };

export async function listClientesOpcoesTipoCaixa(): Promise<
  { success: true; data: ClienteOpcaoTipoCaixa[] } | { success: false; error: string }
> {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const { data, error } = await supabase
    .from('clientes')
    .select('id, nome_fantasia')
    .order('nome_fantasia', { ascending: true });
  if (error) return { success: false, error: error.message };
  const rows = (data ?? []) as { id: string; nome_fantasia: string }[];
  return {
    success: true,
    data: rows.map((r) => ({ id: r.id, nomeFantasia: String(r.nome_fantasia ?? '').trim() || '—' })),
  };
}

export async function listTiposCaixaEmbalagem(): Promise<
  { success: true; data: TipoCaixaEmbalagemListItem[] } | { success: false; error: string }
> {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const { data, error } = await supabase
    .from('tipos_caixa_embalagem')
    .select('id, cliente_id, nome, unidades_por_caixa, ativo, observacao, clientes ( nome_fantasia )')
    .order('nome', { ascending: true });
  if (error) {
    const m = String(error.message ?? '').toLowerCase();
    if (m.includes('does not exist') || m.includes('schema cache') || m.includes('could not find')) {
      return { success: true, data: [] };
    }
    return { success: false, error: error.message };
  }
  const out: TipoCaixaEmbalagemListItem[] = (data ?? []).map((raw) => {
    const r = raw as TipoRow & {
      clientes?: { nome_fantasia?: string | null } | { nome_fantasia?: string | null }[] | null;
    };
    const c = r.clientes;
    const c1 = Array.isArray(c) ? c[0] : c;
    const nomeCliente = String(c1?.nome_fantasia ?? '').trim() || '—';
    return {
      id: r.id,
      clienteId: r.cliente_id,
      clienteNome: nomeCliente,
      nome: r.nome,
      unidadesPorCaixa: Number(r.unidades_por_caixa ?? 0),
      ativo: Boolean(r.ativo),
      observacao: r.observacao ?? null,
    };
  });
  return { success: true, data: out };
}

/** Tipos ativos para o select na ordem diária (com nome do cliente). */
export async function listTiposCaixaEmbalagemAtivosParaOrdem(): Promise<
  { success: true; data: TipoCaixaOrdemOpcao[] } | { success: false; error: string }
> {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const { data, error } = await supabase
    .from('tipos_caixa_embalagem')
    .select('id, nome, unidades_por_caixa, clientes ( nome_fantasia )')
    .eq('ativo', true)
    .order('nome', { ascending: true });
  if (error) {
    const m = String(error.message ?? '').toLowerCase();
    if (m.includes('does not exist') || m.includes('schema cache') || m.includes('could not find')) {
      return { success: true, data: [] };
    }
    return { success: false, error: error.message };
  }
  const out: TipoCaixaOrdemOpcao[] = (data ?? []).map((raw) => {
    const r = raw as Pick<TipoRow, 'id' | 'nome' | 'unidades_por_caixa'> & {
      clientes?: { nome_fantasia?: string | null } | null;
    };
    const c1 = Array.isArray(r.clientes) ? r.clientes[0] : r.clientes;
    return {
      id: r.id,
      nome: r.nome,
      clienteNome: String(c1?.nome_fantasia ?? '').trim() || '—',
      unidadesPorCaixa: Number(r.unidades_por_caixa ?? 0),
    };
  });
  return { success: true, data: out };
}

export async function upsertTipoCaixaEmbalagem(input: {
  id?: string | null;
  clienteId: string;
  nome: string;
  unidadesPorCaixa: number;
  ativo: boolean;
  observacao?: string | null;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const clienteId = input.clienteId?.trim();
  const nome = String(input.nome ?? '').trim();
  const n = Math.round(Number(input.unidadesPorCaixa));
  if (!clienteId) return { success: false, error: 'Cliente obrigatório.' };
  if (!nome) return { success: false, error: 'Nome do tipo de caixa obrigatório.' };
  if (!Number.isFinite(n) || n <= 0) return { success: false, error: 'Unidades por caixa deve ser um inteiro > 0.' };

  const supabase = supabaseClientFactory.createServiceRoleClient();
  const obs = input.observacao?.trim() || null;
  const id = input.id?.trim();

  if (id) {
    const { error } = await supabase
      .from('tipos_caixa_embalagem')
      .update({
        cliente_id: clienteId,
        nome,
        unidades_por_caixa: n,
        ativo: input.ativo,
        observacao: obs,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) return { success: false, error: error.message };
    revalidatePath(PATH);
    return { success: true, id };
  }

  const { data, error } = await supabase
    .from('tipos_caixa_embalagem')
    .insert({
      cliente_id: clienteId,
      nome,
      unidades_por_caixa: n,
      ativo: input.ativo,
      observacao: obs,
    })
    .select('id')
    .single();
  if (error) return { success: false, error: error.message };
  revalidatePath(PATH);
  return { success: true, id: (data as { id: string }).id };
}

export async function deleteTipoCaixaEmbalagem(
  id: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const sid = id?.trim();
  if (!sid) return { success: false, error: 'Id inválido.' };
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const { error } = await supabase.from('tipos_caixa_embalagem').delete().eq('id', sid);
  if (error) return { success: false, error: error.message };
  revalidatePath(PATH);
  return { success: true };
}

export async function listOverridesPorTipoCaixa(
  tipoCaixaEmbalagemId: string,
): Promise<{ success: true; data: ProdutoTipoCaixaOverrideItem[] } | { success: false; error: string }> {
  const tid = tipoCaixaEmbalagemId?.trim();
  if (!tid) return { success: false, error: 'Tipo inválido.' };
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const { data, error } = await supabase
    .from('produtos_tipos_caixa_embalagem')
    .select('id, produto_id, box_units_override, package_units_override, produtos ( nome, codigo )')
    .eq('tipo_caixa_embalagem_id', tid);
  if (error) {
    const m = String(error.message ?? '').toLowerCase();
    if (m.includes('does not exist') || m.includes('schema cache') || m.includes('could not find')) {
      return { success: true, data: [] };
    }
    return { success: false, error: error.message };
  }
  const out: ProdutoTipoCaixaOverrideItem[] = (data ?? []).map((raw) => {
    const r = raw as OverrideRow & {
      produtos?: { nome?: string | null; codigo?: string | null } | null;
    };
    const p = Array.isArray(r.produtos) ? r.produtos[0] : r.produtos;
    return {
      id: r.id,
      produtoId: r.produto_id,
      produtoNome: String(p?.nome ?? '').trim() || '—',
      produtoCodigo: String(p?.codigo ?? '').trim() || '—',
      boxUnitsOverride: r.box_units_override != null ? Number(r.box_units_override) : null,
      packageUnitsOverride: r.package_units_override != null ? Number(r.package_units_override) : null,
    };
  });
  out.sort((a, b) => a.produtoNome.localeCompare(b.produtoNome, 'pt'));
  return { success: true, data: out };
}

export async function upsertProdutoTipoCaixaOverride(input: {
  id?: string | null;
  tipoCaixaEmbalagemId: string;
  produtoId: string;
  boxUnitsOverride?: number | null;
  packageUnitsOverride?: number | null;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const tipoId = input.tipoCaixaEmbalagemId?.trim();
  const produtoId = input.produtoId?.trim();
  if (!tipoId || !produtoId) return { success: false, error: 'Tipo e produto obrigatórios.' };

  const boxRaw = input.boxUnitsOverride;
  const pkgRaw = input.packageUnitsOverride;
  const boxOv =
    boxRaw == null || String(boxRaw).trim() === ''
      ? null
      : Math.round(Number(boxRaw));
  const pkgOv =
    pkgRaw == null || String(pkgRaw).trim() === ''
      ? null
      : Math.round(Number(pkgRaw));
  if (boxOv != null && (!Number.isFinite(boxOv) || boxOv <= 0)) {
    return { success: false, error: 'box_units override deve ser vazio ou inteiro > 0.' };
  }
  if (pkgOv != null && (!Number.isFinite(pkgOv) || pkgOv <= 0)) {
    return { success: false, error: 'package_units override deve ser vazio ou inteiro > 0.' };
  }

  const supabase = supabaseClientFactory.createServiceRoleClient();
  const id = input.id?.trim();

  if (id) {
    const { error } = await supabase
      .from('produtos_tipos_caixa_embalagem')
      .update({
        box_units_override: boxOv,
        package_units_override: pkgOv,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) return { success: false, error: error.message };
    revalidatePath(PATH);
    return { success: true, id };
  }

  const { data, error } = await supabase
    .from('produtos_tipos_caixa_embalagem')
    .insert({
      tipo_caixa_embalagem_id: tipoId,
      produto_id: produtoId,
      box_units_override: boxOv,
      package_units_override: pkgOv,
    })
    .select('id')
    .single();
  if (error) return { success: false, error: error.message };
  revalidatePath(PATH);
  return { success: true, id: (data as { id: string }).id };
}

export async function deleteProdutoTipoCaixaOverride(
  id: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const sid = id?.trim();
  if (!sid) return { success: false, error: 'Id inválido.' };
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const { error } = await supabase.from('produtos_tipos_caixa_embalagem').delete().eq('id', sid);
  if (error) return { success: false, error: error.message };
  revalidatePath(PATH);
  return { success: true };
}
