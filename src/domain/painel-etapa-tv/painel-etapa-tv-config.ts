import type { RealizadoEtapaConfig } from '@/components/Realizado/etapa/types';
import { EMBALAGEM_ETAPA_CONFIG } from '@/domain/embalagem/embalagem-etapa-adapter';
import type { FluxoDisplayMode } from '@/components/FluxoProcesso/fluxo-display-scale';
import type { FluxoEtapaKey } from '@/domain/fluxo-processo/fluxo-processo-types';
import { FERMENTACAO_ETAPA_CONFIG } from '@/domain/producao-etapa/fermentacao-etapa-adapter';
import { FORNO_ETAPA_CONFIG } from '@/domain/producao-etapa/forno-etapa-adapter';

export type PainelEtapaTvId = 'fermentacao' | 'forno' | 'embalagem';

export type PainelEtapaTvConfig = {
  id: PainelEtapaTvId;
  fluxoKey: FluxoEtapaKey;
  mode: FluxoDisplayMode;
  realizado: RealizadoEtapaConfig;
};

const QUADRO = { title: 'Quadro' } as const;

export function getPainelEtapaTvConfig(id: PainelEtapaTvId): PainelEtapaTvConfig {
  if (id === 'fermentacao') {
    return {
      id,
      fluxoKey: 'ferm',
      mode: 'lt',
      realizado: { ...FERMENTACAO_ETAPA_CONFIG, ...QUADRO },
    };
  }
  if (id === 'forno') {
    return {
      id,
      fluxoKey: 'forno',
      mode: 'lt',
      realizado: { ...FORNO_ETAPA_CONFIG, ...QUADRO },
    };
  }
  return {
    id,
    fluxoKey: 'emb',
    mode: 'cx',
    realizado: { ...EMBALAGEM_ETAPA_CONFIG, ...QUADRO },
  };
}
