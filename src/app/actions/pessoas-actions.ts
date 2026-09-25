'use server';

import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type { ColaboradorListaItem } from '@/domain/pessoas/colaborador-lista-filtro';

type ColaboradorJoinRow = {
  codigo: string;
  nome: string;
  situacao: ColaboradorListaItem['situacao'];
  pessoas_setores: { nome: string } | null;
  pessoas_turnos: { nome: string } | null;
};

type PessoasColaboradoresQuery = {
  from: (table: string) => {
    select: (columns: string) => {
      order: (
        column: string,
        options: { ascending: boolean },
      ) => Promise<{ data: ColaboradorJoinRow[] | null; error: { message: string } | null }>;
    };
  };
};

export async function listColaboradores(): Promise<ColaboradorListaItem[]> {
  await requireInternoModulo('interno_pessoas', 'ler');

  const client =
    supabaseClientFactory.createServiceRoleClient() as unknown as PessoasColaboradoresQuery;

  const { data, error } = await client
    .from('pessoas_colaboradores')
    .select('codigo, nome, situacao, pessoas_setores(nome), pessoas_turnos(nome)')
    .order('nome', { ascending: true });

  if (error) {
    throw new Error(`Erro ao listar colaboradores: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    codigo: row.codigo,
    nome: row.nome,
    situacao: row.situacao,
    setorNome: row.pessoas_setores?.nome ?? null,
    turnoNome: row.pessoas_turnos?.nome ?? null,
  }));
}
