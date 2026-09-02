'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { posicaoPopoverAncora } from '@/features/reclamacoes/components/reclamacao-popover-posicao';

const POPOVER_LARGURA = 320;
const POPOVER_ALTURA = 200;

type Props = {
  observacao: string;
};

export function ReclamacaoObservacaoPreview({ observacao }: Props) {
  const botaoRef = useRef<HTMLButtonElement>(null);
  const painelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [fixo, setFixo] = useState(false);
  const fixoRef = useRef(false);

  const marcarFixo = (proximo: boolean) => {
    fixoRef.current = proximo;
    setFixo(proximo);
  };

  const abrir = (element: HTMLElement) => {
    setPos(
      posicaoPopoverAncora(element.getBoundingClientRect(), {
        width: POPOVER_LARGURA,
        height: POPOVER_ALTURA,
      }),
    );
  };

  const fechar = useCallback(() => {
    marcarFixo(false);
    setPos(null);
  }, []);

  useEffect(() => {
    if (!fixo) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') fechar();
    };
    const onDown = (event: MouseEvent) => {
      const alvo = event.target as Node;
      if (botaoRef.current?.contains(alvo) || painelRef.current?.contains(alvo)) return;
      fechar();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onDown);
    };
  }, [fixo, fechar]);

  return (
    <>
      <button
        ref={botaoRef}
        type="button"
        className={[
          'inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2',
          pos
            ? 'bg-amber-50 text-amber-800'
            : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800',
        ].join(' ')}
        aria-label="Ver observação"
        aria-expanded={pos !== null}
        onMouseEnter={(event) => abrir(event.currentTarget)}
        onMouseLeave={() => {
          if (!fixoRef.current) setPos(null);
        }}
        onFocus={(event) => abrir(event.currentTarget)}
        onBlur={() => {
          if (!fixoRef.current) setPos(null);
        }}
        onClick={(event) => {
          event.stopPropagation();
          if (fixoRef.current) {
            fechar();
            return;
          }
          if (event.currentTarget) abrir(event.currentTarget);
          marcarFixo(true);
        }}
      >
        <span className="material-icons text-xl" aria-hidden>
          notes
        </span>
      </button>
      {pos
        ? createPortal(
            <div
              ref={painelRef}
              role={fixo ? 'dialog' : 'tooltip'}
              aria-label="Observação"
              style={{ top: pos.top, left: pos.left, width: POPOVER_LARGURA }}
              className={[
                'fixed z-[70] max-h-52 overflow-y-auto rounded-xl border border-stone-200 bg-white p-3',
                'shadow-[0_12px_24px_-6px_rgb(28_25_23/0.18)]',
                fixo ? '' : 'pointer-events-none',
              ].join(' ')}
            >
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                Observação
              </p>
              <p className="whitespace-pre-wrap text-sm leading-snug text-stone-700">{observacao}</p>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
