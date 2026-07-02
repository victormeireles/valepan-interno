import type { PainelProducaoAreaId, PainelProducaoStatus } from './painel-producao-types';

export const PAINEL_PRODUCAO_STAGES = [
  { key: 'ferm' as const, name: 'Fermentação', icon: 'bakery_dining', accent: '#C6A848' },
  { key: 'forno' as const, name: 'Forno', icon: 'local_fire_department', accent: '#C2410C' },
  { key: 'emb' as const, name: 'Embalagem', icon: 'inventory_2', accent: '#9A6B43' },
];

export const PAINEL_PRODUCAO_AREA_WINDOWS: Record<
  PainelProducaoAreaId,
  { janelaIni: string; janelaFim: string; janela: string }
> = {
  ferm: { janelaIni: '07:00', janelaFim: '18:00', janela: '7h → 18h' },
  forno: { janelaIni: '07:00', janelaFim: '18:00', janela: '7h → 18h' },
  emb: { janelaIni: '07:00', janelaFim: '21:50', janela: '7h → 21h50' },
};

export const PAINEL_PRODUCAO_STATUS_ORDER: PainelProducaoStatus[] = [
  'aguardando',
  'fermentando',
  'forno',
  'embalando',
  'concluido',
];

export const PAINEL_PRODUCAO_STALL_MIN = 150;

export const PAINEL_PRODUCAO_STATUS_META: Record<
  PainelProducaoStatus,
  { label: string; fg: string; bg: string; icon: string }
> = {
  aguardando: {
    label: 'Aguardando',
    fg: 'var(--text-muted)',
    bg: 'var(--surface-sunken)',
    icon: 'hourglass_empty',
  },
  fermentando: {
    label: 'Fermentando',
    fg: '#8A7326',
    bg: 'color-mix(in srgb, #C6A848 16%, white)',
    icon: 'bakery_dining',
  },
  forno: {
    label: 'No forno',
    fg: '#C2410C',
    bg: 'color-mix(in srgb, #C2410C 12%, white)',
    icon: 'local_fire_department',
  },
  embalando: {
    label: 'Embalando',
    fg: '#7A5432',
    bg: 'color-mix(in srgb, #9A6B43 14%, white)',
    icon: 'inventory_2',
  },
  concluido: {
    label: 'Concluído',
    fg: '#059669',
    bg: 'color-mix(in srgb, #059669 12%, white)',
    icon: 'check_circle',
  },
};
