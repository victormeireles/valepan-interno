'use server';

import { SolicitanteSetores } from '@/domain/manutencao/solicitante-setores';
import { SetorOperacional, type SetorLinha } from '@/domain/manutencao/setor-operacional';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

const MODULO_SOLICITACAO = 'interno_manutencao_solicitacao';
const MENSAGEM_SEM_MODULO = 'Usuário sem o módulo de solicitação.';
const MENSAGEM_SALVO = 'Setores salvos.';
const SELECT_PERFIS =
  'usuarios ( id, nome, ativo ), perfis ( ativo, perfil_modulos ( modulo ) )';

type Cliente = ReturnType<typeof supabaseClientFactory.createServiceRoleClient>;
type Resultado = { ok: boolean; mensagem: string };
type UsuarioLista = { id: string; nome: string; setorIds: string[] };
type ModuloLinha = { modulo: string };
type PerfilLinha = {
  ativo: boolean;
  perfil_modulos: ModuloLinha[] | ModuloLinha | null;
};
type UsuarioLinha = { id: string; nome: string; ativo: boolean };
type PerfilVinculo = {
  usuarios: UsuarioLinha | UsuarioLinha[] | null;
  perfis: PerfilLinha | PerfilLinha[] | null;
};

export async function listarSolicitantes(): Promise<{
  usuarios: UsuarioLista[];
  setores: SetorLinha[];
}> {
  await requireInternoModulo('interno_manutencao', 'administrar');
  const client = supabaseClientFactory.createServiceRoleClient();
  const habilitados = usuariosComSolicitacao(await lerVinculos(client));
  const marcados = await setoresPorUsuario(client);
  return {
    usuarios: habilitados.map((usuario) => ({
      ...usuario,
      setorIds: marcados.get(usuario.id) ?? [],
    })),
    setores: new SetorOperacional().filtrar(await lerSetores(client)),
  };
}

export async function salvarSetoresDoSolicitante(
  usuarioId: string,
  setorIds: string[],
): Promise<Resultado> {
  await requireInternoModulo('interno_manutencao', 'administrar');
  const client = supabaseClientFactory.createServiceRoleClient();
  const filtrados = new SolicitanteSetores().filtrar(setorIds, await lerSetores(client));
  if (!filtrados.ok) return filtrados;
  if (!(await possuiModuloSolicitacao(client, usuarioId))) {
    return { ok: false, mensagem: MENSAGEM_SEM_MODULO };
  }
  return substituirSetores(client, usuarioId, filtrados.ids);
}

async function possuiModuloSolicitacao(client: Cliente, usuarioId: string): Promise<boolean> {
  const habilitados = usuariosComSolicitacao(await lerVinculos(client));
  return habilitados.some((usuario) => usuario.id === usuarioId);
}

async function lerSetores(client: Cliente): Promise<SetorLinha[]> {
  const { data, error } = await client
    .from('pessoas_setores' as never)
    .select('id, nome, tipo, ativo');
  if (error) throw new Error(error.message);
  return (data ?? []) as SetorLinha[];
}

async function lerVinculos(client: Cliente): Promise<PerfilVinculo[]> {
  const { data, error } = await client
    .from('usuario_perfis' as never)
    .select(SELECT_PERFIS);
  if (error) throw new Error(error.message);
  return (data ?? []) as PerfilVinculo[];
}

async function setoresPorUsuario(client: Cliente): Promise<Map<string, string[]>> {
  const { data, error } = await client
    .from('manutencao_usuario_setores' as never)
    .select('usuario_id, setor_id');
  if (error) throw new Error(error.message);
  const mapa = new Map<string, string[]>();
  for (const linha of (data ?? []) as { usuario_id: string; setor_id: string }[]) {
    const atuais = mapa.get(linha.usuario_id) ?? [];
    atuais.push(linha.setor_id);
    mapa.set(linha.usuario_id, atuais);
  }
  return mapa;
}

function usuariosComSolicitacao(
  linhas: PerfilVinculo[],
): { id: string; nome: string }[] {
  const porId = new Map<string, { id: string; nome: string }>();
  for (const linha of linhas) {
    const usuario = primeiro(linha.usuarios);
    if (!usuario || usuario.ativo !== true || !perfilSolicita(primeiro(linha.perfis))) continue;
    porId.set(usuario.id, { id: usuario.id, nome: usuario.nome });
  }
  return [...porId.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

function perfilSolicita(perfil: PerfilLinha | null): boolean {
  if (!perfil || perfil.ativo !== true) return false;
  return modulosDe(perfil).some((modulo) => modulo.modulo === MODULO_SOLICITACAO);
}

function modulosDe(perfil: PerfilLinha): ModuloLinha[] {
  if (!perfil.perfil_modulos) return [];
  return Array.isArray(perfil.perfil_modulos)
    ? perfil.perfil_modulos
    : [perfil.perfil_modulos];
}

function primeiro<T>(valor: T | T[] | null): T | null {
  if (!valor) return null;
  return Array.isArray(valor) ? (valor[0] ?? null) : valor;
}

async function substituirSetores(
  client: Cliente,
  usuarioId: string,
  setorIds: string[],
): Promise<Resultado> {
  const apagados = await client
    .from('manutencao_usuario_setores' as never)
    .delete()
    .eq('usuario_id', usuarioId);
  if (apagados.error) return { ok: false, mensagem: apagados.error.message };
  if (setorIds.length === 0) return { ok: true, mensagem: MENSAGEM_SALVO };
  const gravados = await client.from('manutencao_usuario_setores' as never).insert(
    setorIds.map((setorId) => ({ usuario_id: usuarioId, setor_id: setorId })) as never,
  );
  if (gravados.error) return { ok: false, mensagem: gravados.error.message };
  return { ok: true, mensagem: MENSAGEM_SALVO };
}
