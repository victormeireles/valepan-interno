import type { InternoModuloId, NivelModulo } from './interno-modulos-catalog';
import {
  InternoAccessManager,
  type UsuarioAuthzSnapshot,
} from './interno-access-manager';

export function algumModuloAtende(
  snap: UsuarioAuthzSnapshot,
  modulos: readonly InternoModuloId[],
  minimo: NivelModulo,
  manager: InternoAccessManager = new InternoAccessManager(),
): boolean {
  return modulos.some((modulo) => manager.temModulo(snap, modulo, minimo));
}
