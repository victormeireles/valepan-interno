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
    if (item.moduloIds?.length) {
      return item.moduloIds.some((id) => manager.temModulo(snap, id, 'ler'));
    }
    return manager.temModulo(snap, item.moduloId, 'ler');
  });
}
