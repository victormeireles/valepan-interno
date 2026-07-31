'use client';

import { Button } from '@/components/ui/Button';

type InsumoDesmarcarFornecedorDialogProps = {
  open: boolean;
  fornecedorLabel: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (restaurar: boolean) => void;
};

export default function InsumoDesmarcarFornecedorDialog({
  open,
  fornecedorLabel,
  busy = false,
  onCancel,
  onConfirm,
}: InsumoDesmarcarFornecedorDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/50 p-4"
      role="presentation"
      onClick={busy ? undefined : onCancel}
    >
      <div
        role="alertdialog"
        aria-labelledby="desmarcar-fornecedor-title"
        aria-describedby="desmarcar-fornecedor-desc"
        className="w-full max-w-md rounded-xl border border-border-default bg-surface p-6 shadow-control"
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id="desmarcar-fornecedor-title"
          className="text-lg font-semibold text-text-strong"
        >
          Desmarcar fornecedor
        </h2>
        <p id="desmarcar-fornecedor-desc" className="mt-2 text-sm text-text-muted">
          Parar de ignorar {fornecedorLabel}?
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            size="lg"
            disabled={busy}
            className="text-stone-500 hover:text-stone-700"
            onClick={onCancel}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            disabled={busy}
            onClick={() => onConfirm(false)}
          >
            Desmarcar sem restaurar
          </Button>
          <Button
            type="button"
            variant="primary"
            size="lg"
            disabled={busy}
            onClick={() => onConfirm(true)}
          >
            Desmarcar e restaurar pendências
          </Button>
        </div>
      </div>
    </div>
  );
}
