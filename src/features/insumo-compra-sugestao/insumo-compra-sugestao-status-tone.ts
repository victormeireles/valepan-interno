import type { BadgeTone } from '@/components/ui/Badge';
import type { InsumoCompraSugestaoStatus } from '@/domain/insumos/insumo-compra-sugestao-types';

export type InsumoCompraSugestaoStatusVisual = {
  label: string;
  icon: string;
  badgeTone: BadgeTone;
  rowClassName: string;
};

const STATUS_VISUALS: Record<InsumoCompraSugestaoStatus, InsumoCompraSugestaoStatusVisual> = {
  urgente: {
    label: 'Urgente',
    icon: 'error',
    badgeTone: 'danger',
    rowClassName: 'bg-rose-50/70',
  },
  pedir_fora_janela: {
    label: 'Pedir fora da janela',
    icon: 'warning',
    badgeTone: 'warning',
    rowClassName: 'bg-amber-50/60',
  },
  pedir_hoje: {
    label: 'Pedir hoje',
    icon: 'shopping_cart',
    badgeTone: 'warning',
    rowClassName: 'bg-amber-50/40',
  },
  adiar_lote_minimo: {
    label: 'Aguardar lote mínimo',
    icon: 'schedule',
    badgeTone: 'neutral',
    rowClassName: 'bg-stone-50/70',
  },
  ok: {
    label: 'Estoque adequado',
    icon: 'check_circle',
    badgeTone: 'success',
    rowClassName: 'bg-white',
  },
  sem_consumo: {
    label: 'Sem consumo',
    icon: 'remove_circle_outline',
    badgeTone: 'outline',
    rowClassName: 'bg-white',
  },
  sem_regra: {
    label: 'Sem regra',
    icon: 'rule',
    badgeTone: 'outline',
    rowClassName: 'bg-white',
  },
};

export class InsumoCompraSugestaoStatusTone {
  resolve(status: InsumoCompraSugestaoStatus): InsumoCompraSugestaoStatusVisual {
    return STATUS_VISUALS[status];
  }
}

export const insumoCompraSugestaoStatusTone = new InsumoCompraSugestaoStatusTone();
