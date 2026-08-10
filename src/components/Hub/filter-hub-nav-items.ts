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
  return items.filter((item) =>
    manager.temModulo(snap, item.moduloId, 'ler'),
  );
}
