'use server';

import { revalidatePath } from 'next/cache';
import {
  parseCategoriaAssadeiraRegraForm,
  type CategoriaAssadeiraRegraFormData,
} from '@/domain/assadeiras/categoria-assadeira-regra-validation';
import { resolveUnidadesPorAssadeiraEfetiva } from '@/domain/producao/assadeira-factor';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

export type CategoriaOption = {
  id: string;
  nome: string;
};

export type CategoriaAssadeiraRegra = {
  id: string;
  categoria_id: string;
  categoria_nome: string;
  peso_g: number;
  assadeira_id: string;
  assadeira_nome: string;
  unidades_por_assadeira: number | null;
  assadeira_padrao_unidades: number | null;
  unidades_efetivas: number | null;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

type ActionResult<T = CategoriaAssadeiraRegra> =
  | { success: true; data: T }
  | { success: false; error: string };

const REGRA_SELECT =
  'id, categoria_id, peso_g, assadeira_id, unidades_por_assadeira, ordem, ativo, created_at, updated_at, categorias(nome), assadeiras(nome, unidades_por_assadeira)';

type RegraRow = {
  id: string;
  categoria_id: string;
  peso_g: number;
  assadeira_id: string;
  unidades_por_assadeira: number | null;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  categorias: { nome: string } | { nome: string }[] | null;
  assadeiras: {
    nome: string;
    unidades_por_assadeira: number | null;
  } | {
    nome: string;
    unidades_por_assadeira: number | null;
  }[] | null;
};

function unwrapJoin<T>(value: T | T[] | null): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapRegraRow(row: RegraRow): CategoriaAssadeiraRegra {
  const categoria = unwrapJoin(row.categorias);
  const assadeira = unwrapJoin(row.assadeiras);
  const assadeiraPadrao = assadeira?.unidades_por_assadeira ?? null;

  return {
    id: row.id,
    categoria_id: row.categoria_id,
    categoria_nome: categoria?.nome ?? '—',
    peso_g: row.peso_g,
    assadeira_id: row.assadeira_id,
    assadeira_nome: assadeira?.nome ?? '—',
    unidades_por_assadeira: row.unidades_por_assadeira,
    assadeira_padrao_unidades: assadeiraPadrao,
    unidades_efetivas: resolveUnidadesPorAssadeiraEfetiva({
      produto: row.unidades_por_assadeira,
      assadeira: assadeiraPadrao,
    }),
    ordem: row.ordem,
    ativo: row.ativo,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function findDuplicateRegra(
  categoriaId: string,
  pesoG: number,
  assadeiraId: string,
  excludeId?: string,
): Promise<boolean> {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  let query = supabase
    .from('categoria_assadeira_regras')
    .select('id')
    .eq('categoria_id', categoriaId)
    .eq('peso_g', pesoG)
    .eq('assadeira_id', assadeiraId)
    .eq('ativo', true);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error('Erro ao verificar duplicata de regra:', error);
    return true;
  }
  return data != null;
}

export async function getCategoriasAtivas(): Promise<CategoriaOption[]> {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const { data, error } = await supabase
    .from('categorias')
    .select('id, nome')
    .eq('ativo', true)
    .order('nome', { ascending: true });

  if (error) {
    console.error('Erro ao buscar categorias:', error);
    return [];
  }

  return (data ?? []) as CategoriaOption[];
}

export async function getCategoriaAssadeiraRegras(
  includeInactive = true,
): Promise<CategoriaAssadeiraRegra[]> {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  let query = supabase
    .from('categoria_assadeira_regras')
    .select(REGRA_SELECT)
    .order('categoria_id', { ascending: true })
    .order('peso_g', { ascending: true })
    .order('ordem', { ascending: true });

  if (!includeInactive) {
    query = query.eq('ativo', true);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Erro ao buscar regras de assadeira:', error);
    return [];
  }

  return ((data ?? []) as RegraRow[]).map(mapRegraRow);
}

async function persistRegra(
  parsed: CategoriaAssadeiraRegraFormData,
  id?: string,
): Promise<ActionResult> {
  const isDuplicate = await findDuplicateRegra(
    parsed.categoria_id,
    parsed.peso_g,
    parsed.assadeira_id,
    id,
  );

  if (isDuplicate) {
    return {
      success: false,
      error: 'Já existe uma regra ativa para esta categoria, peso e assadeira',
    };
  }

  const supabase = supabaseClientFactory.createServiceRoleClient();
  const payload = {
    categoria_id: parsed.categoria_id,
    peso_g: parsed.peso_g,
    assadeira_id: parsed.assadeira_id,
    unidades_por_assadeira: parsed.unidades_por_assadeira,
    ordem: parsed.ordem,
    ativo: parsed.ativo,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const { data, error } = await supabase
      .from('categoria_assadeira_regras')
      .update(payload)
      .eq('id', id)
      .select(REGRA_SELECT)
      .single();

    if (error) {
      console.error('Erro ao atualizar regra de assadeira:', error);
      return { success: false, error: 'Erro ao atualizar regra' };
    }

    revalidatePath('/config/regras-assadeiras');
    return { success: true, data: mapRegraRow(data as RegraRow) };
  }

  const { data, error } = await supabase
    .from('categoria_assadeira_regras')
    .insert(payload)
    .select(REGRA_SELECT)
    .single();

  if (error) {
    console.error('Erro ao criar regra de assadeira:', error);
    return { success: false, error: 'Erro ao criar regra' };
  }

  revalidatePath('/config/regras-assadeiras');
  return { success: true, data: mapRegraRow(data as RegraRow) };
}

export async function createCategoriaAssadeiraRegra(
  input: unknown,
): Promise<ActionResult> {
  const parsed = parseCategoriaAssadeiraRegraForm(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Dados inválidos',
    };
  }

  return persistRegra(parsed.data);
}

export async function updateCategoriaAssadeiraRegra(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = parseCategoriaAssadeiraRegraForm(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Dados inválidos',
    };
  }

  return persistRegra(parsed.data, id);
}

export async function deactivateCategoriaAssadeiraRegra(
  id: string,
): Promise<ActionResult> {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const { data, error } = await supabase
    .from('categoria_assadeira_regras')
    .update({ ativo: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(REGRA_SELECT)
    .single();

  if (error) {
    console.error('Erro ao desativar regra de assadeira:', error);
    return { success: false, error: 'Erro ao desativar regra' };
  }

  revalidatePath('/config/regras-assadeiras');
  return { success: true, data: mapRegraRow(data as RegraRow) };
}
