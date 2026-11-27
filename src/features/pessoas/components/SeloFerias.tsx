import { Badge } from '@/components/ui/Badge';
import { FeriasPeriodo, type PeriodoFerias } from '@/domain/pessoas/ferias-periodo';

export function SeloFerias({ periodo }: { periodo?: PeriodoFerias | null }) {
  if (!periodo) return null;
  return <Badge tone="neutral">{new FeriasPeriodo().selo(periodo)}</Badge>;
}
