import { useMemo } from 'react';
import { normalizeFilaStationQuery } from '@/lib/production/production-station-routes';
import type { Station } from '@/lib/utils/production-conversions';

export function useProductionQueueStation(station: string | undefined = 'massa') {
  const stationNormalized = useMemo(() => normalizeFilaStationQuery(station ?? null), [station]);

  const effectiveStation = useMemo<Station>(() => {
    const allowed: Station[] = [
      'massa',
      'fermentacao',
      'entrada_forno',
      'saida_forno',
      'entrada_embalagem',
      'saida_embalagem',
    ];
    return allowed.includes(stationNormalized as Station)
      ? (stationNormalized as Station)
      : 'massa';
  }, [stationNormalized]);

  return { stationNormalized, effectiveStation };
}
