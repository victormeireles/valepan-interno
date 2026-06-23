'use client';

import { Button } from '@/components/ui/Button';

type EtapaContinuidadeConfirmDialogProps = {
  open: boolean;
  titulo: string;
  mensagem: string;
  textoConfirmar: string;
  onVoltar: () => void;
  onConfirmar: () => void;
};

export default function EtapaContinuidadeConfirmDialog({
  open,
  titulo,
  mensagem,
  textoConfirmar,
  onVoltar,
  onConfirmar,
}: EtapaContinuidadeConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/50 p-4"
      role="presentation"
      onClick={onVoltar}
    >
      <div
        role="alertdialog"
        aria-labelledby="etapa-continuidade-title"
        aria-describedby="etapa-continuidade-desc"
        className="w-full max-w-md rounded-xl border border-border-default bg-surface p-6 shadow-control"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="etapa-continuidade-title" className="text-lg font-semibold text-text-strong">
          {titulo}
        </h2>
        <p id="etapa-continuidade-desc" className="mt-2 text-sm text-text-muted">
          {mensagem}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="text-stone-500 hover:text-stone-700"
            onClick={onConfirmar}
          >
            {textoConfirmar}
          </Button>
          <Button type="button" variant="primary" size="lg" onClick={onVoltar}>
            Voltar e editar
          </Button>
        </div>
      </div>
    </div>
  );
}
