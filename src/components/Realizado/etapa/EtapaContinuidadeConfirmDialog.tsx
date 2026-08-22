'use client';

import { Button } from '@/components/ui/Button';
import {
  EtapaContinuidadeQuantidadeResumo,
  type EtapaContinuidadeQuantidadeResumoProps,
} from './EtapaContinuidadeQuantidadeResumo';

type EtapaContinuidadeConfirmDialogProps = {
  open: boolean;
  titulo: string;
  mensagem: string;
  textoConfirmar: string;
  resumo: EtapaContinuidadeQuantidadeResumoProps | null;
  onVoltar: () => void;
  onConfirmar: () => void;
};

export default function EtapaContinuidadeConfirmDialog({
  open,
  titulo,
  mensagem,
  textoConfirmar,
  resumo,
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
        aria-modal="true"
        aria-labelledby="etapa-continuidade-title"
        aria-describedby="etapa-continuidade-desc"
        className="w-full max-w-md rounded-xl border border-border-default bg-surface p-6 shadow-control"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-600"
            aria-hidden="true"
          >
            <span className="material-icons text-[22px]">info</span>
          </span>
          <div className="min-w-0">
            <h2
              id="etapa-continuidade-title"
              className="text-lg font-semibold tracking-[-0.01em] text-text-strong"
            >
              {titulo}
            </h2>
            <p
              id="etapa-continuidade-desc"
              className="mt-2 text-sm leading-relaxed text-text-muted"
            >
              {mensagem}
            </p>
          </div>
        </div>
        {resumo ? <EtapaContinuidadeQuantidadeResumo {...resumo} /> : null}
        <div className="mt-6 flex flex-col gap-2">
          <Button type="button" variant="ghost" size="lg" fullWidth onClick={onConfirmar}>
            {textoConfirmar}
          </Button>
          <Button type="button" variant="primary" size="lg" fullWidth onClick={onVoltar}>
            Voltar e editar
          </Button>
        </div>
      </div>
    </div>
  );
}
