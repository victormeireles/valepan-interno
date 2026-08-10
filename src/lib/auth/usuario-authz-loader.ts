import type { SupabaseClient } from '@supabase/supabase-js';
import type { DatabaseComAuthz } from '@/types/database-authz';
import type { UsuarioAuthzSnapshot } from './interno-access-manager';
import {
  PerfilModulosResolver,
  type PerfilModuloRow,
} from './perfil-modulos-resolver';
import type { NivelModulo } from './interno-modulos-catalog';

type UsuarioAuthzRow = {
  ativo: boolean;
  is_system_owner: boolean;
  nome: string;
  email: string | null;
};

type PerfilJoinRow = {
  id: string;
  nome: string;
  ativo: boolean;
  perfil_modulos: Array<{ modulo: string; nivel: string }> | null;
};

type UsuarioPerfilJoinRow = {
  perfil_id: string;
  perfil: PerfilJoinRow | PerfilJoinRow[] | null;
};

function unwrapPerfil(
  perfil: PerfilJoinRow | PerfilJoinRow[] | null,
): PerfilJoinRow | null {
  if (!perfil) return null;
  return Array.isArray(perfil) ? (perfil[0] ?? null) : perfil;
}

function isNivelModulo(value: string): value is NivelModulo {
  return value === 'ler' || value === 'editar' || value === 'administrar';
}

/**
 * Carrega snapshot de authz do usuário a partir do banco compartilhado.
 * Perfis/módulos só entram com identidade `interno` ou system owner.
 */
export class UsuarioAuthzLoader {
  private readonly resolver = new PerfilModulosResolver();

  constructor(private readonly supabase: SupabaseClient<DatabaseComAuthz>) {}

  async load(usuarioId: string): Promise<UsuarioAuthzSnapshot | null> {
    const usuario = await this.loadUsuario(usuarioId);
    if (!usuario || !usuario.ativo) return null;

    const identidades = await this.loadIdentidades(usuarioId);
    const isSystemOwner = Boolean(usuario.is_system_owner);
    const podeResolverPerfis =
      isSystemOwner || identidades.includes('interno');

    if (!podeResolverPerfis) {
      return {
        isSystemOwner,
        identidades,
        modulosEfetivos: {},
      };
    }

    const moduloRows = await this.loadModulosDePerfisAtivos(usuarioId);
    return {
      isSystemOwner,
      identidades,
      modulosEfetivos: this.resolver.resolve(moduloRows),
    };
  }

  private async loadUsuario(
    usuarioId: string,
  ): Promise<UsuarioAuthzRow | null> {
    const { data, error } = await this.supabase
      .from('usuarios')
      .select('ativo, is_system_owner, nome, email')
      .eq('id', usuarioId)
      .maybeSingle();

    if (error) throw error;
    return data as UsuarioAuthzRow | null;
  }

  private async loadIdentidades(usuarioId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('usuario_papeis')
      .select('papel')
      .eq('usuario_id', usuarioId)
      .order('papel', { ascending: true });

    if (error) throw error;
    return (data ?? []).map((row) => row.papel);
  }

  private async loadModulosDePerfisAtivos(
    usuarioId: string,
  ): Promise<PerfilModuloRow[]> {
    const { data, error } = await this.supabase
      .from('usuario_perfis')
      .select(
        `
        perfil_id,
        perfil:perfis (
          id,
          nome,
          ativo,
          perfil_modulos ( modulo, nivel )
        )
      `,
      )
      .eq('usuario_id', usuarioId);

    if (error) throw error;

    const rows = (data ?? []) as unknown as UsuarioPerfilJoinRow[];
    const moduloRows: PerfilModuloRow[] = [];

    for (const row of rows) {
      const perfil = unwrapPerfil(row.perfil);
      if (!perfil || perfil.ativo !== true) continue;

      for (const modulo of perfil.perfil_modulos ?? []) {
        if (!isNivelModulo(modulo.nivel)) continue;
        moduloRows.push({ modulo: modulo.modulo, nivel: modulo.nivel });
      }
    }

    return moduloRows;
  }
}
