'use server';

import { ColaboradorListaRowParser } from '@/domain/pessoas/colaborador-lista-row-parser';
import type { ColaboradorListaItem } from '@/domain/pessoas/colaborador-lista-filtro';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

const COLABORADORES_SELECT =
  'codigo, nome, situacao, lider_setor, pessoas_setores(nome), pessoas_turnos(nome, codigo)';

export async function listColaboradores(): Promise<ColaboradorListaItem[]> {
  await requireInternoModulo('interno_pessoas', 'ler');

  const client = supabaseClientFactory.createServiceRoleClient();
  const { data, error } = await client
    .from('pessoas_colaboradores' as never)
    .select(COLABORADORES_SELECT)
    .order('nome', { ascending: true });

  if (error) {
    throw new Error(`Erro ao listar colaboradores: ${error.message}`);
  }

  const itens = new ColaboradorListaRowParser().parseAll(data);
  const avisos = await client
    .from('pessoas_avisos' as never)
    .select('pessoas_colaboradores(codigo)')
    .eq('situacao', 'ativo');
  if (avisos.error) throw new Error(avisos.error.message);
  const comAviso = new Set(
    ((avisos.data ?? []) as { pessoas_colaboradores: { codigo: string } | { codigo: string }[] | null }[])
      .map((row) => {
        const pessoa = Array.isArray(row.pessoas_colaboradores)
          ? row.pessoas_colaboradores[0]
          : row.pessoas_colaboradores;
        return pessoa?.codigo ?? '';
      })
      .filter(Boolean),
  );
  return itens.map((item) => ({ ...item, avisoAtivo: comAviso.has(item.codigo) }));
}
