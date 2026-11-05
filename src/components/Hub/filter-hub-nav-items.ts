import {
  InternoAccessManager,
  type UsuarioAuthzSnapshot,
} from '@/lib/auth/interno-access-manager';
import type { HubNavItem } from '@/components/Hub/hub-nav-config';

export function filterHubNavItems(
  items: HubNavItem[],
  snap: UsuarioAuthzSnapshot,
  manager: InternoAccessManager = new InternoAccessManager(),
): HubNavItem[] {
  return items.filter((item) => {
    const minimo = item.nivelMinimo ?? 'ler';
    if (item.moduloIds?.length) {
      return item.moduloIds.some((id) => manager.temModulo(snap, id, minimo));
    }
    return manager.temModulo(snap, item.moduloId, minimo);
  });
}
