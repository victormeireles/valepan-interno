import { HubHeader } from '@/components/Hub/HubHeader';
import { HubNavCard } from '@/components/Hub/HubNavCard';
import { HubSection } from '@/components/Hub/HubSection';
import { filterHubNavItems } from '@/components/Hub/filter-hub-nav-items';
import { HUB_SECTIONS } from '@/components/Hub/hub-nav-config';
import { auth } from '@/lib/auth';
import { InternoAccessManager } from '@/lib/auth/interno-access-manager';
import { sessionToAuthzSnapshot } from '@/lib/auth/session-authz-snapshot';
import { getHubStats } from '@/lib/hub/hub-stats-service';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [stats, session] = await Promise.all([getHubStats(), auth()]);
  const manager = new InternoAccessManager();
  const snap = session?.user?.id
    ? sessionToAuthzSnapshot(session)
    : {
        isSystemOwner: false,
        identidades: [] as string[],
        modulosEfetivos: {},
      };

  const sections = HUB_SECTIONS.map((section) => ({
    ...section,
    items: filterHubNavItems(section.items, snap, manager),
  })).filter((section) => section.items.length > 0);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <HubHeader
        ordensHoje={stats.ordensHoje}
        etiquetasPendentes={stats.etiquetasPendentes}
      />

      {sections.map((section) => (
        <HubSection key={section.id} title={section.title}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {section.items.map((item) => (
              <HubNavCard key={item.href} item={item} />
            ))}
          </div>
        </HubSection>
      ))}
    </div>
  );
}
