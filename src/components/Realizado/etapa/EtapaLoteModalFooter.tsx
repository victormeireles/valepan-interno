'use client';

import { Button } from '@/components/ui/Button';

type EtapaLoteModalFooterProps = {
  usualContinuaProduzindo: boolean;
  busy: boolean;
  onCancel: () => void;
  onSalvar: () => void;
  onSalvarEFinalizar: () => void;
};

const outlineStoneClass =
  'border-stone-300 bg-surface text-stone-700 shadow-none hover:bg-stone-50';

export default function EtapaLoteModalFooter({
  usualContinuaProduzindo,
  busy,
  onCancel,
  onSalvar,
  onSalvarEFinalizar,
}: EtapaLoteModalFooterProps) {
  const salvarIsPrimary = usualContinuaProduzindo;

  return (
    <div className="sticky bottom-0 shrink-0 border-t border-stone-100 bg-white px-5 py-4 sm:px-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" size="lg" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button
          variant={salvarIsPrimary ? 'primary' : 'secondary'}
          size="lg"
          className={salvarIsPrimary ? undefined : outlineStoneClass}
          onClick={onSalvar}
          disabled={busy}
        >
          Salvar
        </Button>
        <Button
          variant={salvarIsPrimary ? 'secondary' : 'primary'}
          size="lg"
          className={salvarIsPrimary ? outlineStoneClass : undefined}
          onClick={onSalvarEFinalizar}
          disabled={busy}
        >
          Salvar e finalizar
        </Button>
      </div>
    </div>
  );
}
