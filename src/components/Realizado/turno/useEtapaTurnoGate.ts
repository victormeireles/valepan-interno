'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  confirmEtapaTurnoAtivo,
  TURNO_TROCA_ERRO,
} from '@/domain/producao-turno/etapa-turno-ativo-client';
import { EtapaTurnoGate } from '@/domain/producao-turno/etapa-turno-gate';
import type { ProducaoTurnoCargaAtivo } from '@/domain/producao-turno/producao-turno-carga';
import type { TurnoSheetModel } from '@/domain/producao-turno/producao-turno-sheet-model';
import type {
  ProducaoTurnoCadastrado,
  ProducaoTurnoEtapaId,
  ProducaoTurnoNumero,
} from '@/domain/producao-turno/producao-turno-types';

export type UseEtapaTurnoGateOptions = {
  etapa: ProducaoTurnoEtapaId;
  turnos: ProducaoTurnoCadastrado[];
  turnoAtivo: ProducaoTurnoCargaAtivo | null;
  onError: (message: string) => void;
};

export function useEtapaTurnoGate({
  etapa,
  turnos,
  turnoAtivo,
  onError,
}: UseEtapaTurnoGateOptions) {
  const gate = useMemo(() => new EtapaTurnoGate(), []);
  const [ativo, setAtivo] = useState<ProducaoTurnoCargaAtivo | null>(turnoAtivo);
  const [sheet, setSheet] = useState<TurnoSheetModel | null>(null);
  const [saving, setSaving] = useState(false);
  const pendingProceed = useRef<(() => void) | null>(null);

  useEffect(() => {
    setAtivo(turnoAtivo);
  }, [turnoAtivo]);

  const chip = gate.resolveChip(ativo);

  const ensureTurnoThen = useCallback(
    (proceed: () => void) => {
      const plan = gate.planEnsure({
        turnos,
        ativo,
        now: new Date(),
      });
      if (plan.action === 'proceed') {
        pendingProceed.current = null;
        proceed();
        return;
      }
      pendingProceed.current = proceed;
      setSheet(plan.sheet);
    },
    [ativo, gate, turnos],
  );

  const openChipSheet = useCallback(() => {
    pendingProceed.current = null;
    setSheet(gate.planChipSheet(turnos));
  }, [gate, turnos]);

  const cancelSheet = useCallback(() => {
    pendingProceed.current = null;
    setSheet(null);
  }, []);

  const chooseNumero = useCallback(
    async (numero: ProducaoTurnoNumero) => {
      setSaving(true);
      try {
        const now = new Date();
        await confirmEtapaTurnoAtivo(etapa, numero);
        setAtivo(gate.ativoAposConfirmacao(numero, now));
        setSheet(null);
        const proceed = pendingProceed.current;
        pendingProceed.current = null;
        proceed?.();
      } catch {
        onError(TURNO_TROCA_ERRO);
      } finally {
        setSaving(false);
      }
    },
    [etapa, gate, onError],
  );

  return {
    chip,
    sheet,
    saving,
    ensureTurnoThen,
    openChipSheet,
    cancelSheet,
    chooseNumero,
  };
}
