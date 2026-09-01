import { HubHeader } from '@/components/Hub/HubHeader';
import { HubNavCard } from '@/components/Hub/HubNavCard';
import { HubSection } from '@/components/Hub/HubSection';
import { filterHubNavItems } from '@/components/Hub/filter-hub-nav-items';
import {
  HUB_OPERACAO_ITEMS,
  HUB_PAINEIS_ITEMS,
  HUB_PRODUCAO_ITEMS,
} from '@/components/Hub/hub-nav-config';
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

  const producao = filterHubNavItems(HUB_PRODUCAO_ITEMS, snap, manager);
  const paineis = filterHubNavItems(HUB_PAINEIS_ITEMS, snap, manager);
  const operacao = filterHubNavItems(HUB_OPERACAO_ITEMS, snap, manager);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <HubHeader
        ordensHoje={stats.ordensHoje}
        etiquetasPendentes={stats.etiquetasPendentes}
      />

      {producao.length > 0 ? (
        <HubSection title="Produção realizada">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {producao.map((item) => (
              <HubNavCard key={item.href} item={item} />
            ))}
          </div>
        </HubSection>
      ) : null}

      {paineis.length > 0 ? (
        <HubSection title="Painéis">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {paineis.map((item) => (
              <HubNavCard key={item.href} item={item} />
            ))}
          </div>
        </HubSection>
      ) : null}

      {operacao.length > 0 ? (
        <HubSection title="Operação">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {operacao.map((item) => (
              <HubNavCard key={item.href} item={item} />
            ))}
          </div>
        </HubSection>
      ) : null}
    </div>
  );
}
