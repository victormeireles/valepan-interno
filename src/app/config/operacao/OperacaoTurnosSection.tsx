'use client';

import OperacaoTurnoEtapaBlock from './OperacaoTurnoEtapaBlock';
import {
  OPERACAO_ETAPA_IDS,
  OPERACAO_ETAPA_LABELS,
  type OperacaoEtapaDrafts,
} from './operacao-turno-draft';

type OperacaoTurnosSectionProps = {
  drafts: OperacaoEtapaDrafts;
  disabled?: boolean;
  onChange: (next: OperacaoEtapaDrafts) => void;
};

export default function OperacaoTurnosSection({
  drafts,
  disabled = false,
  onChange,
}: OperacaoTurnosSectionProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-stone-800">Turnos</h2>
      <p className="text-xs text-stone-500">
        Se o fim for menor que o início, vale o dia seguinte (ex.: 7h → 5h).
      </p>
      <div className="space-y-3">
        {OPERACAO_ETAPA_IDS.map((etapa) => (
          <OperacaoTurnoEtapaBlock
            key={etapa}
            label={OPERACAO_ETAPA_LABELS[etapa]}
            draft={drafts[etapa]}
            disabled={disabled}
            onChange={(next) => onChange({ ...drafts, [etapa]: next })}
          />
        ))}
      </div>
    </section>
  );
}
