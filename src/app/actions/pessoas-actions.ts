'use server';

import { ColaboradorListaRowParser } from '@/domain/pessoas/colaborador-lista-row-parser';
import type { ColaboradorListaItem } from '@/domain/pessoas/colaborador-lista-filtro';
import { ExamePrazo } from '@/domain/pessoas/exame-prazo';
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
      .map((row) => codigoDe(row.pessoas_colaboradores))
      .filter(Boolean),
  );
  const exames = await client
    .from('pessoas_exames' as never)
    .select('data, pessoas_colaboradores(codigo)');
  if (exames.error) throw new Error(exames.error.message);
  const ultimos = new ExamePrazo().ultimos(
    ((exames.data ?? []) as { data: string; pessoas_colaboradores: { codigo: string } | { codigo: string }[] | null }[]).map(
      (row) => ({ codigo: codigoDe(row.pessoas_colaboradores), data: String(row.data ?? '') }),
    ),
  );
  return itens.map((item) => ({
    ...item,
    avisoAtivo: comAviso.has(item.codigo),
    ultimoExame: ultimos.get(item.codigo) ?? null,
  }));
}

function codigoDe(valor: { codigo: string } | { codigo: string }[] | null): string {
  const pessoa = Array.isArray(valor) ? valor[0] : valor;
  return pessoa?.codigo ?? '';
}
