import { HubHeader } from '@/components/Hub/HubHeader';
import { HubNavCard } from '@/components/Hub/HubNavCard';
import { HubSection } from '@/components/Hub/HubSection';
import {
  HUB_OPERACAO_ITEMS,
  HUB_PRODUCAO_ITEMS,
} from '@/components/Hub/hub-nav-config';
import { getHubStats } from '@/lib/hub/hub-stats-service';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const stats = await getHubStats();

  return (
    <div className="mx-auto w-full max-w-7xl">
      <HubHeader
        ordensHoje={stats.ordensHoje}
        etiquetasPendentes={stats.etiquetasPendentes}
      />

      <HubSection title="Produção realizada">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HUB_PRODUCAO_ITEMS.map((item) => (
            <HubNavCard key={item.href} item={item} />
          ))}
        </div>
      </HubSection>

      <HubSection title="Operação">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HUB_OPERACAO_ITEMS.map((item) => (
            <HubNavCard key={item.href} item={item} />
          ))}
        </div>
      </HubSection>
    </div>
  );
}
