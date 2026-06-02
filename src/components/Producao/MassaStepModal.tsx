'use client';

import { useEffect, useState } from 'react';
import MassaStepClient from '@/app/producao/etapas/[ordemId]/massa/MassaStepClient';
import type { ProductionQueueItem } from './queue/production-queue-types';
import { toMassaStepOrder } from './massa-step-modal-order';

interface MassaStepModalProps {
  isOpen: boolean;
  ordem: ProductionQueueItem;
  initialLoteId?: string;
  onClose: () => void;
  onSaved?: () => void;
}

export default function MassaStepModal({
  isOpen,
  ordem,
  initialLoteId,
  onClose,
  onSaved,
}: MassaStepModalProps) {
  const [modalTitle, setModalTitle] = useState('Registro de massa');

  useEffect(() => {
    if (!isOpen) {
      setModalTitle('Registro de massa');
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/55 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="massa-step-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Fechar formulario de massa"
        onClick={onClose}
      />
      <div
        className="relative z-10 flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-[90dvh] sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 bg-white px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 id="massa-step-modal-title" className="text-base font-bold leading-tight text-slate-950">
              {modalTitle}
            </h2>
            <p className="truncate text-xs text-slate-500">
              {ordem.lote_codigo} - {ordem.produtos.nome}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            aria-label="Fechar"
          >
            <span className="material-icons text-xl leading-none" aria-hidden>
              close
            </span>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70">
          <MassaStepClient
            ordemProducao={toMassaStepOrder(ordem)}
            initialLoteId={initialLoteId}
            embedded
            onEmbeddedMainTitleChange={setModalTitle}
            onRequestClose={onClose}
            onSaved={onSaved}
          />
        </div>
      </div>
    </div>
  );
}
