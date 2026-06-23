'use client';

import { Button } from '@/components/ui/Button';

type EtapaReabrirConfirmDialogProps = {
  open: boolean;
  titulo: string;
  mensagem: string;
  textoConfirmar: string;
  loading?: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
};

export default function EtapaReabrirConfirmDialog({
  open,
  titulo,
  mensagem,
  textoConfirmar,
  loading = false,
  onCancelar,
  onConfirmar,
}: EtapaReabrirConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/50 p-4"
      role="presentation"
      onClick={onCancelar}
    >
      <div
        role="alertdialog"
        aria-labelledby="etapa-reabrir-title"
        aria-describedby="etapa-reabrir-desc"
        className="w-full max-w-md rounded-xl border border-border-default bg-surface p-6 shadow-control"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="etapa-reabrir-title" className="text-lg font-semibold text-text-strong">
          {titulo}
        </h2>
        <p id="etapa-reabrir-desc" className="mt-2 text-sm text-text-muted">
          {mensagem}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            disabled={loading}
            onClick={onCancelar}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            size="lg"
            icon="replay"
            disabled={loading}
            onClick={onConfirmar}
          >
            {loading ? 'Reabrindo…' : textoConfirmar}
          </Button>
        </div>
      </div>
    </div>
  );
}
