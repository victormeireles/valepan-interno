'use client';

import { useCallback, useEffect, useState } from 'react';
import { EtapaTurnoUltimoStore } from '@/domain/producao-turno/etapa-turno-ultimo-store';
import { resolveTurnoPreselecao } from '@/domain/producao-turno/producao-turno-preselecao';
import type {
  ProducaoTurnoCadastrado,
  ProducaoTurnoEtapaId,
  ProducaoTurnoNumero,
} from '@/domain/producao-turno/producao-turno-types';
import { brazilClockMinutes } from '@/lib/utils/date-utils';

type UseEtapaTurnoLoteFieldInput = {
  etapa: ProducaoTurnoEtapaId;
  turnos: ProducaoTurnoCadastrado[];
  isNewLoteOpen: boolean;
};

function createClientStore(): EtapaTurnoUltimoStore {
  return new EtapaTurnoUltimoStore(window.localStorage);
}

export function useEtapaTurnoLoteField({
  etapa,
  turnos,
  isNewLoteOpen,
}: UseEtapaTurnoLoteFieldInput) {
  const [loteTurno, setLoteTurno] = useState<ProducaoTurnoNumero | null>(null);

  useEffect(() => {
    if (!isNewLoteOpen) return;
    const store = createClientStore();
    const ultimo = store.read(etapa);
    const agoraMin = brazilClockMinutes(new Date());
    setLoteTurno(resolveTurnoPreselecao({ turnos, agoraMin, ultimo }));
  }, [etapa, isNewLoteOpen, turnos]);

  const persistUltimo = useCallback(() => {
    if (loteTurno == null) return;
    createClientStore().write(etapa, loteTurno);
  }, [etapa, loteTurno]);

  return {
    loteTurno,
    setLoteTurno,
    persistUltimo,
  };
}
