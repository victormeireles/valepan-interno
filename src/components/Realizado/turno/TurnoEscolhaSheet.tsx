'use client';

import { Button } from '@/components/ui/Button';
import type { TurnoSheetModel } from '@/domain/producao-turno/producao-turno-sheet-model';
import type { ProducaoTurnoNumero } from '@/domain/producao-turno/producao-turno-types';

type TurnoEscolhaSheetProps = {
  model: TurnoSheetModel | null;
  saving?: boolean;
  onEscolher: (numero: ProducaoTurnoNumero) => void;
  onCancelar: () => void;
};

export default function TurnoEscolhaSheet({
  model,
  saving = false,
  onEscolher,
  onCancelar,
}: TurnoEscolhaSheetProps) {
  if (!model) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-stone-900/50 p-4 sm:items-center"
      role="presentation"
      onClick={onCancelar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="turno-escolha-title"
        className="w-full max-w-md rounded-xl border border-border-default bg-surface p-6 shadow-control"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="turno-escolha-title" className="text-lg font-semibold text-text-strong">
          {model.title}
        </h2>
        <div className="mt-4 flex flex-col gap-2">
          {model.actions.map((action) => (
            <Button
              key={action.numero}
              type="button"
              variant={action.primary ? 'primary' : 'secondary'}
              size="lg"
              fullWidth
              disabled={saving}
              onClick={() => onEscolher(action.numero)}
            >
              {action.label}
            </Button>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="lg"
            fullWidth
            disabled={saving}
            onClick={onCancelar}
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
