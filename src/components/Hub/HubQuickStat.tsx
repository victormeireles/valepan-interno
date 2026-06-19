import { Card } from '@/components/ui/Card';

interface HubQuickStatProps {
  label: string;
  value: number | string;
  accent?: boolean;
}

export function HubQuickStat({ label, value, accent = false }: HubQuickStatProps) {
  return (
    <Card padding="sm" className="min-w-[7.5rem] flex-1 sm:min-w-[8.5rem] sm:flex-none">
      <p className="text-[0.6875rem] font-medium uppercase tracking-wide text-text-muted">
        {label}
      </p>
      <p
        className={[
          'mt-1 font-mono text-2xl font-bold tabular-nums leading-none tracking-tight',
          accent ? 'text-accent' : 'text-text-strong',
        ].join(' ')}
      >
        {value}
      </p>
    </Card>
  );
}
