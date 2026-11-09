'use server';

import { FilaFundacao } from '@/domain/manutencao/fila-fundacao';
import { ManutencaoAcesso } from '@/domain/manutencao/manutencao-acesso';
import { SetorOperacional, type SetorLinha } from '@/domain/manutencao/setor-operacional';
import type { InternoModuloId } from '@/lib/auth/interno-modulos-catalog';
import { requireInternoQualquerModulo } from '@/lib/auth/require-interno-modulo';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

const MODULOS_FILA: readonly InternoModuloId[] = [
  'interno_manutencao',
  'interno_manutencao_solicitacao',
];

export async function carregarFilaFundacao(): Promise<{ mensagem: string }> {
  const { snap, usuarioId } = await requireInternoQualquerModulo(MODULOS_FILA, 'ler');
  if (new ManutencaoAcesso().veTodas(snap)) {
    return { mensagem: new FilaFundacao().mensagem(true, 0) };
  }
  const setoresValidos = await contarSetoresElegiveis(usuarioId);
  return { mensagem: new FilaFundacao().mensagem(false, setoresValidos) };
}

async function contarSetoresElegiveis(usuarioId: string): Promise<number> {
  const client = supabaseClientFactory.createServiceRoleClient();
  const marcados = await client
    .from('manutencao_usuario_setores' as never)
    .select('setor_id')
    .eq('usuario_id', usuarioId);
  if (marcados.error) throw new Error(marcados.error.message);

  const ids = ((marcados.data ?? []) as { setor_id: string }[]).map((linha) => linha.setor_id);
  if (ids.length === 0) return 0;

  const setores = await client
    .from('pessoas_setores' as never)
    .select('id, nome, tipo, ativo')
    .in('id', ids);
  if (setores.error) throw new Error(setores.error.message);
  return new SetorOperacional().filtrar((setores.data ?? []) as SetorLinha[]).length;
}
