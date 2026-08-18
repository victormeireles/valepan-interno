'use client';

import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import {
  operacaoTurnoDraftManager,
  type EtapaDraft,
  type TurnoClockDraft,
} from './operacao-turno-draft';

type OperacaoTurnoEtapaBlockProps = {
  label: string;
  draft: EtapaDraft;
  disabled?: boolean;
  onChange: (next: EtapaDraft) => void;
};

export default function OperacaoTurnoEtapaBlock({
  label,
  draft,
  disabled = false,
  onChange,
}: OperacaoTurnoEtapaBlockProps) {
  const setClock = (slot: 't1' | 't2' | 't3', field: keyof TurnoClockDraft, value: string) => {
    const current = draft[slot];
    if (!current) return;
    onChange({ ...draft, [slot]: { ...current, [field]: value } });
  };

  return (
    <section className="space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
      <h3 className="text-sm font-semibold text-stone-800">{label}</h3>

      <TurnoClockFields
        caption="1º turno"
        clocks={draft.t1}
        disabled={disabled}
        onChange={(field, value) => setClock('t1', field, value)}
      />

      <Switch
        label="2º turno"
        checked={Boolean(draft.t2)}
        disabled={disabled}
        onChange={(checked) =>
          onChange(operacaoTurnoDraftManager.setTurnoEnabled(draft, 2, checked))
        }
      />

      {draft.t2 ? (
        <TurnoClockFields
          clocks={draft.t2}
          disabled={disabled}
          onChange={(field, value) => setClock('t2', field, value)}
        />
      ) : null}

      <Switch
        label="3º turno"
        checked={Boolean(draft.t3)}
        disabled={disabled || !draft.t2}
        onChange={(checked) =>
          onChange(operacaoTurnoDraftManager.setTurnoEnabled(draft, 3, checked))
        }
      />

      {draft.t3 ? (
        <TurnoClockFields
          clocks={draft.t3}
          disabled={disabled}
          onChange={(field, value) => setClock('t3', field, value)}
        />
      ) : null}
    </section>
  );
}

type TurnoClockFieldsProps = {
  caption?: string;
  clocks: TurnoClockDraft;
  disabled: boolean;
  onChange: (field: keyof TurnoClockDraft, value: string) => void;
};

function TurnoClockFields({ caption, clocks, disabled, onChange }: TurnoClockFieldsProps) {
  return (
    <div className="space-y-2">
      {caption ? (
        <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
          {caption}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          type="time"
          label="Início"
          numeric
          value={clocks.inicio}
          onChange={(event) => onChange('inicio', event.target.value)}
          disabled={disabled}
        />
        <Input
          type="time"
          label="Fim"
          numeric
          value={clocks.fim}
          onChange={(event) => onChange('fim', event.target.value)}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
