import { HubQuickStat } from '@/components/Hub/HubQuickStat';
import { formatHubDateSubtitle, getHubGreeting } from '@/components/Hub/hub-greeting';

interface HubHeaderProps {
  ordensHoje: number;
  etiquetasPendentes: number;
}

export function HubHeader({ ordensHoje, etiquetasPendentes }: HubHeaderProps) {
  const now = new Date();

  return (
    <header className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-strong sm:text-3xl">
          {getHubGreeting(now)}
        </h1>
        <p className="mt-1.5 text-sm text-text-muted sm:text-base">
          {formatHubDateSubtitle(now)}
        </p>
      </div>

      <div className="flex w-full gap-3 sm:w-auto">
        <HubQuickStat label="Ordens hoje" value={ordensHoje} />
        <HubQuickStat
          label="Etiquetas pend."
          value={etiquetasPendentes}
          accent={etiquetasPendentes > 0}
        />
      </div>
    </header>
  );
}
