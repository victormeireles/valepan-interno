'use server';

import { HorarioSemana } from '@/domain/pessoas/horario-semana';
import type { HorarioDiaQuadro } from '@/domain/pessoas/quadro-agrupamento';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

export type TurnoHorarioResultado = { ok: boolean; mensagem: string };

export async function salvarTurnoHorario(entrada: {
  codigo: string;
  setorCodigo: string;
  nome: string;
  vagas: number;
  dias: HorarioDiaQuadro[];
}): Promise<TurnoHorarioResultado> {
  const dias = new HorarioSemana().normalizar(entrada.dias);
  const erro = new HorarioSemana().validar(dias);
  if (erro) return { ok: false, mensagem: erro };
  if (!entrada.nome.trim()) return { ok: false, mensagem: 'Informe o nome do turno.' };
  return rpc('pessoas_salvar_turno', {
    p_codigo: entrada.codigo,
    p_setor: entrada.setorCodigo,
    p_nome: entrada.nome.trim(),
    p_vagas: entrada.vagas,
    p_dias: dias,
  });
}

export async function removerTurno(codigo: string): Promise<TurnoHorarioResultado> {
  return rpc('pessoas_remover_turno', { p_codigo: codigo });
}

async function rpc(nome: string, args: Record<string, unknown>): Promise<TurnoHorarioResultado> {
  await requireInternoModulo('interno_pessoas', 'editar');
  const client = supabaseClientFactory.createServiceRoleClient();
  const { error } = await client.rpc(nome as never, args as never);
  if (error) return { ok: false, mensagem: limpar(error.message) };
  return { ok: true, mensagem: 'Turno atualizado.' };
}

function limpar(mensagem: string): string {
  return mensagem.replace(/^.*ERROR:\s*/i, '').trim();
}
