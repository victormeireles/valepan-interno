import type { FluxoEtapaKey } from './fluxo-processo-types';

export const FLUXO_GAP_MIN_MINUTES = 45;

/** Limite LT por lançamento (fermentação). Acima = digitação em bloco. */
export const FLUXO_BLOCO_MAX_LT_FERM = 40;

/** Limite LT por lançamento (forno). Acima = digitação em bloco. */
export const FLUXO_BLOCO_MAX_LT_FORNO = 20;

/** Limite CX por lançamento (embalagem). Acima = digitação em bloco. */
export const FLUXO_BLOCO_MAX_CX = 55;

export const FLUXO_FALLBACK_UN_POR_LATA = 24;

export const FLUXO_FALLBACK_UN_POR_CAIXA = 48;

export const FLUXO_LEAD_BIN_COUNT = 12;

export const FLUXO_CAPACIDADE_INFORMADA: Record<
  FluxoEtapaKey,
  { un: number; lt: number }
> = {
  ferm: { un: 9_600, lt: 400 },
  forno: { un: 6_000, lt: 250 },
  emb: { un: 9_600, lt: 400 },
};

export const FLUXO_PADRAO = {
  camaraMin: 180,
  resfrioMin: 60,
} as const;

export const FLUXO_ETAPA_NOME: Record<FluxoEtapaKey, string> = {
  ferm: 'Fermentação',
  forno: 'Forno',
  emb: 'Embalagem',
};

export const FLUXO_ETAPA_COR: Record<FluxoEtapaKey, string> = {
  ferm: '#C6A848',
  forno: '#C2410C',
  emb: '#9A6B43',
};

export const FLUXO_ASSADEIRA_SEM = 'N/A';

/** Ordem e cores fixas do protótipo validado. */
export const FLUXO_ASSADEIRA_ORDEM_BASE: string[] = [
  '65g verde',
  '50g',
  '60g nova preta',
  'Bun',
  '60g BM',
  '75g',
  'Hot',
  'Pão Francês',
  FLUXO_ASSADEIRA_SEM,
];

export const FLUXO_ASSADEIRA_CORES: Record<string, string> = {
  '65g verde': '#6B7233',
  '50g': '#C6A848',
  '60g nova preta': '#3F0313',
  Bun: '#B45309',
  '60g BM': '#C2410C',
  '75g': '#9A6B43',
  Hot: '#78716C',
  'Pão Francês': '#A3374D',
  [FLUXO_ASSADEIRA_SEM]: '#A8A29E',
};

export const FLUXO_COR_ASSADEIRA_FALLBACK = '#A8A29E';
