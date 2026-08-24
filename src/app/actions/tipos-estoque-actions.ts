'use server';

import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { mensagemExcecaoReceitaCaixaInvalida } from '@/domain/etiquetas/tipo-estoque-receita-caixa';

import { revalidatePath } from 'next/cache';
import {
  parseTipoEstoqueForm,
  type TipoEstoqueFormData,
} from '@/domain/etiquetas/tipo-estoque-validation';
import {
  tiposEstoqueAdminService,
  type TipoEstoqueAdminRecord,
} from '@/lib/services/tipos-estoque-admin-service';

export type TipoEstoqueAdmin = {
  id: string;
  nome: string;
  ativo: boolean;
  possui_etiqueta: boolean;
  congelado: boolean;
  mostrar_texto_congelado: boolean;
  receita_caixa_id: string | null;
  receita_caixa_nome: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ActionResult<T = TipoEstoqueAdmin> =
  | { success: true; data: T }
  | { success: false; error: string };

function mapRecord(record: TipoEstoqueAdminRecord): TipoEstoqueAdmin {
  return {
    id: record.id,
    nome: record.nome,
    ativo: record.ativo,
    possui_etiqueta: record.possui_etiqueta,
    congelado: record.congelado,
    mostrar_texto_congelado: record.mostrar_texto_congelado,
    receita_caixa_id: record.receita_caixa_id,
    receita_caixa_nome: record.receita_caixa_nome,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

export async function listTiposEstoqueAdmin(
  includeInactive = true,
): Promise<TipoEstoqueAdmin[]> {
  await requireInternoModulo('interno_config', 'administrar');
  try {
    const records = await tiposEstoqueAdminService.list(includeInactive);
    return records.map(mapRecord);
  } catch (error) {
    console.error('Erro ao listar tipos de estoque:', error);
    return [];
  }
}

async function persistTipoEstoque(
  parsed: TipoEstoqueFormData,
  id?: string,
): Promise<ActionResult> {
  const isDuplicate = await tiposEstoqueAdminService.findDuplicateNome(parsed.nome, id);
  if (isDuplicate) {
    return { success: false, error: 'Já existe um tipo de estoque com este nome' };
  }

  if (parsed.receita_caixa_id) {
    const supabase = supabaseClientFactory.createServiceRoleClient();
    const { data: receita } = await supabase
      .from('receitas')
      .select('tipo')
      .eq('id', parsed.receita_caixa_id)
      .maybeSingle();
    const erroTipo = mensagemExcecaoReceitaCaixaInvalida(receita);
    if (erroTipo) return { success: false, error: erroTipo };
  }

  try {
    const record = id
      ? await tiposEstoqueAdminService.update(id, parsed)
      : await tiposEstoqueAdminService.create(parsed);

    revalidatePath('/config/tipos-estoque');
    return { success: true, data: mapRecord(record) };
  } catch (error) {
    console.error('Erro ao salvar tipo de estoque:', error);
    return {
      success: false,
      error: id ? 'Erro ao atualizar tipo de estoque' : 'Erro ao criar tipo de estoque',
    };
  }
}

export async function createTipoEstoque(input: unknown): Promise<ActionResult> {
  await requireInternoModulo('interno_config', 'administrar');
  const parsed = parseTipoEstoqueForm(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Dados inválidos',
    };
  }

  return persistTipoEstoque(parsed.data);
}

export async function updateTipoEstoque(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  await requireInternoModulo('interno_config', 'administrar');
  const parsed = parseTipoEstoqueForm(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Dados inválidos',
    };
  }

  return persistTipoEstoque(parsed.data, id);
}

export async function listReceitasCaixaAtivas(): Promise<Array<{ id: string; nome: string }>> {
  await requireInternoModulo('interno_config', 'ler');
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const { data, error } = await supabase
    .from('receitas')
    .select('id, nome')
    .eq('tipo', 'caixa')
    .eq('ativo', true)
    .order('nome', { ascending: true });
  if (error) {
    console.error('Erro ao listar receitas de caixa:', error);
    return [];
  }
  return (data ?? []).map((row) => ({ id: row.id, nome: row.nome }));
}

export async function deactivateTipoEstoque(id: string): Promise<ActionResult> {
  await requireInternoModulo('interno_config', 'administrar');
  try {
    const record = await tiposEstoqueAdminService.deactivate(id);
    revalidatePath('/config/tipos-estoque');
    return { success: true, data: mapRecord(record) };
  } catch (error) {
    console.error('Erro ao desativar tipo de estoque:', error);
    return { success: false, error: 'Erro ao desativar tipo de estoque' };
  }
}
