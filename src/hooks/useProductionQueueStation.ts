import { useMemo } from 'react';
import { normalizeFilaStationQuery } from '@/lib/production/production-station-routes';
import type { Station } from '@/lib/utils/production-conversions';

export function useProductionQueueStation(station: string | undefined) {
  const stationNormalized = useMemo(() => normalizeFilaStationQuery(station ?? null), [station]);

  const effectiveStation = useMemo<Station>(() => {
    const allowed: Station[] = [
      'planejamento',
      'massa',
      'fermentacao',
      'entrada_forno',
      'saida_forno',
      'entrada_embalagem',
      'saida_embalagem',
    ];
    return allowed.includes(stationNormalized as Station)
      ? (stationNormalized as Station)
      : 'planejamento';
  }, [stationNormalized]);

  return { stationNormalized, effectiveStation };
}
