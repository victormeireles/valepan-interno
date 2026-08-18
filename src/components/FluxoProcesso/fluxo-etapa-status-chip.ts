import type { BadgeTone } from '@/components/ui/Badge';
import type { FluxoControleStatusBand } from '@/domain/fluxo-processo/controle/fluxo-controle-types';

export type FluxoEtapaStatusChip = {
  tone: BadgeTone;
  icon: string;
  label: FluxoControleStatusBand;
};

export class FluxoEtapaStatusChipResolver {
  resolve(status: FluxoControleStatusBand): FluxoEtapaStatusChip {
    if (status === 'atrasado') {
      return { tone: 'warning', icon: 'schedule', label: 'atrasado' };
    }
    if (status === 'adiantado') {
      return { tone: 'success', icon: 'trending_up', label: 'adiantado' };
    }
    return { tone: 'neutral', icon: 'check_circle', label: 'no plano' };
  }
}
