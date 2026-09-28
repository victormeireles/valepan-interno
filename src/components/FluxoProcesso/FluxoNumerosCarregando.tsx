import { Card } from '@/components/ui/Card';
import { pageShellPaddingX } from '@/components/ui/page-shell';
import { Skeleton } from '@/components/ui/Skeleton';

const ETAPAS_PRIMEIRA_CARGA = ['Fermentação', 'Forno', 'Embalagem'] as const;

export function FluxoNumerosStatus() {
  return (
    <p
      className="flex items-center gap-2 text-sm font-medium text-text-strong"
      role="status"
      aria-live="polite"
    >
      <span
        className="material-icons animate-spin text-[18px] text-accent motion-reduce:animate-none"
        aria-hidden
      >
        autorenew
      </span>
      Carregando números
    </p>
  );
}

export function FluxoEtapaNumerosSkeleton() {
  return (
    <div className="mt-3 space-y-2.5" aria-hidden>
      <Skeleton className="motion-reduce:animate-none" width="9.5rem" height="1.75rem" />
      <Skeleton className="motion-reduce:animate-none" width="100%" height="0.5rem" radius="9999px" />
      <Skeleton className="motion-reduce:animate-none" width="7.5rem" height="1rem" />
      <Skeleton className="motion-reduce:animate-none" width="11rem" height="0.875rem" />
    </div>
  );
}

export function FluxoProcessoPrimeiraCarga() {
  return (
    <div className={['mx-auto w-full min-w-0 max-w-[1360px] space-y-3.5 py-4', pageShellPaddingX].join(' ')}>
      <FluxoNumerosStatus />
      <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-3">
        {ETAPAS_PRIMEIRA_CARGA.map((nome) => (
          <Card key={nome} padding="md" className="min-w-0" aria-busy="true">
            <span className="text-[15px] font-bold tracking-tight text-text-strong">{nome}</span>
            <FluxoEtapaNumerosSkeleton />
          </Card>
        ))}
      </div>
    </div>
  );
}
