import {
  ElegibilidadeAjudante,
  type PerfilAjudante,
} from '@/domain/manutencao/elegibilidade-ajudante';
import type { ClienteOrdem } from './manutencao-ordem-leitura';

const SELECT_VINCULOS =
  'usuarios ( id, nome, ativo ), perfis ( ativo, is_sistema, perfil_modulos ( modulo, nivel ) )';

export type AjudanteOficina = { id: string; nome: string };

type ModuloLinha = { modulo: string; nivel: string };
type PerfilLinha = {
  ativo: boolean;
  is_sistema: boolean;
  perfil_modulos: ModuloLinha[] | ModuloLinha | null;
};
type UsuarioLinha = { id: string; nome: string; ativo: boolean };
type VinculoPerfil = {
  usuarios: UsuarioLinha | UsuarioLinha[] | null;
  perfis: PerfilLinha | PerfilLinha[] | null;
};

export class AjudantesOficina {
  constructor(
    private readonly client: ClienteOrdem,
    private readonly elegibilidade = new ElegibilidadeAjudante(),
  ) {}

  async listar(receptorId: string | null): Promise<AjudanteOficina[]> {
    const porId = new Map<string, AjudanteOficina>();
    for (const linha of await this.ler(null)) {
      const usuario = this.escolhaDe(linha, receptorId);
      if (usuario) porId.set(usuario.id, usuario);
    }
    return [...porId.values()].sort((esquerda, direita) =>
      esquerda.nome.localeCompare(direita.nome, 'pt-BR'),
    );
  }

  async idsElegiveis(ids: string[]): Promise<Set<string>> {
    const elegiveis = new Set<string>();
    if (ids.length === 0) return elegiveis;
    for (const linha of await this.ler(ids)) {
      const usuario = primeiro(linha.usuarios);
      if (!usuario || usuario.ativo !== true || !this.aceita(linha)) continue;
      elegiveis.add(usuario.id);
    }
    return elegiveis;
  }

  private async ler(ids: string[] | null): Promise<VinculoPerfil[]> {
    const base = this.client.from('usuario_perfis' as never).select(SELECT_VINCULOS);
    const consulta = ids ? base.in('usuario_id', ids) : base;
    const { data, error } = await consulta;
    if (error) throw new Error(error.message);
    return (data ?? []) as VinculoPerfil[];
  }

  private escolhaDe(linha: VinculoPerfil, receptorId: string | null): AjudanteOficina | null {
    const usuario = primeiro(linha.usuarios);
    if (!usuario || usuario.ativo !== true || usuario.id === receptorId) return null;
    if (!this.aceita(linha)) return null;
    return { id: usuario.id, nome: usuario.nome };
  }

  private aceita(linha: VinculoPerfil): boolean {
    return this.elegibilidade.aceita(this.perfilDe(primeiro(linha.perfis)));
  }

  private perfilDe(perfil: PerfilLinha | null): PerfilAjudante | null {
    if (!perfil) return null;
    return {
      ativo: perfil.ativo,
      sistema: perfil.is_sistema === true,
      modulos: this.modulosDe(perfil),
    };
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
