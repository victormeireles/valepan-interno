'use client';

import { useEffect, useId } from 'react';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import ModalPortal from '@/components/ui/ModalPortal';

export type RemocaoCadastroEstado =
  | {
      modo: 'bloqueio';
      titulo: string;
      mensagem: string;
      vinculos: string[];
    }
  | {
      modo: 'confirmacao';
      titulo: string;
      descricao: string;
    };

type RemocaoCadastroModalProps = {
  estado: RemocaoCadastroEstado | null;
  salvando?: boolean;
  onFechar: () => void;
  onConfirmar?: () => void | Promise<unknown>;
};

export function RemocaoCadastroModal({
  estado,
  salvando = false,
  onFechar,
  onConfirmar,
}: RemocaoCadastroModalProps) {
  const tituloId = useId();

  useEffect(() => {
    if (!estado) return;
    const fecharTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape' && !salvando) onFechar();
    };
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', fecharTecla);
    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener('keydown', fecharTecla);
    };
  }, [estado, onFechar, salvando]);

  if (!estado) return null;

  function tentarFechar() {
    if (!salvando) onFechar();
  }

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/40 p-0 sm:items-center sm:p-4"
        onClick={tentarFechar}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby={tituloId}
          className={[
            'flex w-full max-w-md flex-col overflow-hidden border-stone-200 bg-white shadow-lg',
            'max-h-[100dvh] rounded-t-2xl border sm:max-h-[min(85dvh,28rem)] sm:rounded-2xl',
            'pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] sm:pt-0',
          ].join(' ')}
          onClick={(evento) => evento.stopPropagation()}
        >
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-stone-100 px-4 py-4 sm:px-5">
            <h2
              id={tituloId}
              className="text-lg font-semibold tracking-tight text-stone-900 sm:text-xl"
            >
              {estado.titulo}
            </h2>
            <IconButton
              icon="close"
              label="Fechar"
              size="lg"
              variant="ghost"
              disabled={salvando}
              onClick={tentarFechar}
            />
          </header>
          <div className="space-y-3 px-4 py-4 sm:px-5">
            {estado.modo === 'bloqueio' ? (
              <ConteudoBloqueio mensagem={estado.mensagem} vinculos={estado.vinculos} />
            ) : (
              <p className="text-sm text-stone-700">{estado.descricao}</p>
            )}
          </div>
          <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-stone-100 px-4 py-4 sm:flex-row sm:px-5">
            {estado.modo === 'confirmacao' ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  disabled={salvando}
                  className="flex-1"
                  onClick={tentarFechar}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="lg"
                  icon="delete"
                  disabled={salvando}
                  className="flex-1"
                  onClick={() => void onConfirmar?.()}
                >
                  {salvando ? 'Removendo…' : 'Remover'}
                </Button>
              </>
            ) : (
              <Button type="button" size="lg" className="flex-1" onClick={tentarFechar}>
                Entendi
              </Button>
            )}
          </div>
        </section>
      </div>
    </ModalPortal>
  );
}

function ConteudoBloqueio({
  mensagem,
  vinculos,
}: {
  mensagem: string;
  vinculos: string[];
}) {
  return (
    <div className="space-y-3">
      <p
        role="alert"
        className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-medium text-amber-900"
      >
        <span className="material-icons mt-0.5 text-base" aria-hidden="true">
          warning
        </span>
        <span>{mensagem}</span>
      </p>
      <ul className="space-y-1.5">
        {vinculos.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-stone-800">
            <span className="material-icons mt-0.5 text-base text-stone-400" aria-hidden="true">
              link
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
