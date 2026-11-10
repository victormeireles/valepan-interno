'use server';

import { nivelAtende, type NivelModulo } from '@/lib/auth/interno-modulos-catalog';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type { ClienteOrdem } from './manutencao-ordem-leitura';

const MODULO_OFICINA = 'interno_manutencao';
const SELECT_AJUDANTES =
  'usuarios ( id, nome, ativo ), perfis ( ativo, perfil_modulos ( modulo, nivel ) )';

export type AjudanteOficina = { id: string; nome: string };

type ModuloLinha = { modulo: string; nivel: string };
type PerfilLinha = {
  ativo: boolean;
  perfil_modulos: ModuloLinha[] | ModuloLinha | null;
};
type UsuarioLinha = { id: string; nome: string; ativo: boolean };
type VinculoPerfil = {
  usuarios: UsuarioLinha | UsuarioLinha[] | null;
  perfis: PerfilLinha | PerfilLinha[] | null;
};

export async function listarAjudantesOficina(numero: number): Promise<AjudanteOficina[]> {
  await requireInternoModulo(MODULO_OFICINA, 'editar');
  const client = supabaseClientFactory.createServiceRoleClient();
  const receptorId = await receptorDaOrdem(client, numero);
  const vinculos = await lerVinculos(client);
  return new ElegibilidadeOficina().listar(vinculos, receptorId);
}

async function receptorDaOrdem(client: ClienteOrdem, numero: number): Promise<string | null> {
  if (!Number.isInteger(numero) || numero <= 0) return null;
  const { data, error } = await client
    .from('manutencao_ordens' as never)
    .select('recebida_por')
    .eq('numero', numero)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const linha = data as { recebida_por: string | null } | null;
  return linha?.recebida_por ?? null;
}

async function lerVinculos(client: ClienteOrdem): Promise<VinculoPerfil[]> {
  const { data, error } = await client.from('usuario_perfis' as never).select(SELECT_AJUDANTES);
  if (error) throw new Error(error.message);
  return (data ?? []) as VinculoPerfil[];
}

class ElegibilidadeOficina {
  listar(linhas: VinculoPerfil[], receptorId: string | null): AjudanteOficina[] {
    const porId = new Map<string, AjudanteOficina>();
    for (const linha of linhas) {
      const usuario = this.usuarioDe(linha, receptorId);
      if (usuario) porId.set(usuario.id, usuario);
    }
    return [...porId.values()].sort((esquerda, direita) =>
      esquerda.nome.localeCompare(direita.nome, 'pt-BR'),
    );
  }

  private usuarioDe(linha: VinculoPerfil, receptorId: string | null): AjudanteOficina | null {
    const usuario = primeiro(linha.usuarios);
    if (!usuario || usuario.ativo !== true || usuario.id === receptorId) return null;
    if (!this.perfilOficina(primeiro(linha.perfis))) return null;
    return { id: usuario.id, nome: usuario.nome };
  }

  private perfilOficina(perfil: PerfilLinha | null): boolean {
    if (!perfil || perfil.ativo !== true) return false;
    return this.modulosDe(perfil).some((modulo) => this.oficinaEditar(modulo));
  }

  private oficinaEditar(modulo: ModuloLinha): boolean {
    if (modulo.modulo !== MODULO_OFICINA || !this.nivelConhecido(modulo.nivel)) return false;
    return nivelAtende(modulo.nivel, 'editar');
  }

  private nivelConhecido(nivel: string): nivel is NivelModulo {
    return nivel === 'ler' || nivel === 'editar' || nivel === 'administrar';
  }

  private modulosDe(perfil: PerfilLinha): ModuloLinha[] {
    if (!perfil.perfil_modulos) return [];
    return Array.isArray(perfil.perfil_modulos) ? perfil.perfil_modulos : [perfil.perfil_modulos];
  }
}

function primeiro<T>(valor: T | T[] | null): T | null {
  if (!valor) return null;
  return Array.isArray(valor) ? (valor[0] ?? null) : valor;
}
