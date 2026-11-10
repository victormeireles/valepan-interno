import { algumModuloAtende } from '@/lib/auth/algum-modulo-atende';
import {
  InternoAccessManager,
  type UsuarioAuthzSnapshot,
} from '@/lib/auth/interno-access-manager';
import type { InternoModuloId } from '@/lib/auth/interno-modulos-catalog';

const MODULO_MANUTENCAO: InternoModuloId = 'interno_manutencao';

export const MODULOS_PRODUCAO_SOLICITACAO: readonly InternoModuloId[] = [
  'interno_fermentacao',
  'interno_forno',
  'interno_embalagem',
];

export const MODULOS_MANUTENCAO_ENTRADA: readonly InternoModuloId[] = [
  MODULO_MANUTENCAO,
  ...MODULOS_PRODUCAO_SOLICITACAO,
];

export class ManutencaoAcesso {
  constructor(private readonly manager = new InternoAccessManager()) {}

  veTodas(snap: UsuarioAuthzSnapshot): boolean {
    return this.manager.temModulo(snap, MODULO_MANUTENCAO, 'ler');
  }

  movimenta(snap: UsuarioAuthzSnapshot): boolean {
    return this.manager.temModulo(snap, MODULO_MANUTENCAO, 'editar');
  }

  administra(snap: UsuarioAuthzSnapshot): boolean {
    return this.manager.temModulo(snap, MODULO_MANUTENCAO, 'administrar');
  }

  veFila(snap: UsuarioAuthzSnapshot): boolean {
    return (
      this.manager.temModulo(snap, MODULO_MANUTENCAO, 'ler') ||
      algumModuloAtende(snap, MODULOS_PRODUCAO_SOLICITACAO, 'editar', this.manager)
    );
  }

  abreCorretiva(snap: UsuarioAuthzSnapshot): boolean {
    return (
      this.manager.temModulo(snap, MODULO_MANUTENCAO, 'editar') ||
      algumModuloAtende(snap, MODULOS_PRODUCAO_SOLICITACAO, 'editar', this.manager)
    );
  }

  executaOficina(snap: UsuarioAuthzSnapshot): boolean {
    return this.manager.temModulo(snap, MODULO_MANUTENCAO, 'editar');
  }
}
