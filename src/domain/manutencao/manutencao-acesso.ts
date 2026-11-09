import { algumModuloAtende } from '@/lib/auth/algum-modulo-atende';
import {
  InternoAccessManager,
  type UsuarioAuthzSnapshot,
} from '@/lib/auth/interno-access-manager';
import type { InternoModuloId } from '@/lib/auth/interno-modulos-catalog';

const MODULO_MANUTENCAO: InternoModuloId = 'interno_manutencao';
const MODULOS_FILA: readonly InternoModuloId[] = [
  'interno_manutencao',
  'interno_manutencao_solicitacao',
];

export class ManutencaoAcesso {
  constructor(private readonly manager = new InternoAccessManager()) {}

  veTodas(snap: UsuarioAuthzSnapshot): boolean {
    return this.manager.temModulo(snap, MODULO_MANUTENCAO, 'ler');
  }

  administra(snap: UsuarioAuthzSnapshot): boolean {
    return this.manager.temModulo(snap, MODULO_MANUTENCAO, 'administrar');
  }

  veFila(snap: UsuarioAuthzSnapshot): boolean {
    return algumModuloAtende(snap, MODULOS_FILA, 'ler', this.manager);
  }
}
