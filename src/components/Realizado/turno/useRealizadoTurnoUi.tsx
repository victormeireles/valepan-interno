'use client';

import TurnoAtivoChip from './TurnoAtivoChip';
import TurnoEscolhaSheet from './TurnoEscolhaSheet';
import {
  useEtapaTurnoGate,
  type UseEtapaTurnoGateOptions,
} from './useEtapaTurnoGate';

export function useRealizadoTurnoUi(options: UseEtapaTurnoGateOptions) {
  const gate = useEtapaTurnoGate(options);

  return {
    turnoChip: (
      <TurnoAtivoChip presentation={gate.chip} onClick={gate.openChipSheet} />
    ),
    turnoSheet: (
      <TurnoEscolhaSheet
        model={gate.sheet}
        saving={gate.saving}
        onEscolher={gate.chooseNumero}
        onCancelar={gate.cancelSheet}
      />
    ),
    ensureTurnoThen: gate.ensureTurnoThen,
    onTurnoRequerido: gate.openChipSheet,
  };
}
