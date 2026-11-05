import {
  InternoAccessManager,
  type UsuarioAuthzSnapshot,
} from '@/lib/auth/interno-access-manager';
import type { InternoModuloId, NivelModulo } from '@/lib/auth/interno-modulos-catalog';
import type { MainNavEntry, MainNavGroup } from '@/config/main-nav-config';

function linkVisivel(
  link: { moduloId?: InternoModuloId; moduloIds?: InternoModuloId[]; nivelMinimo?: NivelModulo },
  snap: UsuarioAuthzSnapshot,
  manager: InternoAccessManager,
): boolean {
  const minimo = link.nivelMinimo ?? 'ler';
  if (link.moduloIds?.length) {
    return link.moduloIds.some((id) => manager.temModulo(snap, id, minimo));
  }
  if (!link.moduloId) return true;
  return manager.temModulo(snap, link.moduloId, minimo);
}

export function filterMainNavEntries(
  entries: MainNavEntry[],
  snap: UsuarioAuthzSnapshot,
  manager: InternoAccessManager = new InternoAccessManager(),
): MainNavEntry[] {
  const filtered: MainNavEntry[] = [];

  for (const entry of entries) {
    if (entry.type === 'link') {
      if (linkVisivel(entry, snap, manager)) {
        filtered.push(entry);
      }
      continue;
    }

    const children = entry.children.filter((child) =>
      linkVisivel(child, snap, manager),
    );
    if (children.length === 0) continue;

    const group: MainNavGroup = {
      ...entry,
      children,
      match: (pathname) => children.some((child) => child.match(pathname)),
    };
    filtered.push(group);
  }

  return filtered;
}
