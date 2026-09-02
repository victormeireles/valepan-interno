'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { indiceFotoCircular } from '@/features/reclamacoes/components/reclamacao-foto-indice';
import { ReclamacaoFotoLightboxBotao } from '@/features/reclamacoes/components/ReclamacaoFotoLightboxBotao';

type Props = {
  srcs: string[];
  inicial?: number;
  onClose: () => void;
};

export function ReclamacaoFotoLightbox({ srcs, inicial = 0, onClose }: Props) {
  const [index, setIndex] = useState(inicial);
  const atual = srcs[index] ?? srcs[0];
  const varias = srcs.length > 1;

  useEffect(() => {
    setIndex(inicial);
  }, [inicial]);

  useEffect(() => {
    if (!atual) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (!varias) return;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setIndex((i) => indiceFotoCircular(i, srcs.length, -1));
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setIndex((i) => indiceFotoCircular(i, srcs.length, 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [atual, varias, srcs.length, onClose]);

  if (!atual || typeof document === 'undefined') return null;

  const ir = (direcao: -1 | 1) => {
    setIndex((i) => indiceFotoCircular(i, srcs.length, direcao));
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={varias ? `Foto ${index + 1} de ${srcs.length}` : 'Foto da reclamação'}
      className="fixed inset-0 z-[80] bg-stone-900/80"
      onClick={onClose}
    >
      <div className="absolute right-3 top-3 z-10">
        <ReclamacaoFotoLightboxBotao icon="close" label="Fechar foto" onClick={onClose} />
      </div>

      <div className="flex h-full items-center justify-center gap-2 px-3 sm:gap-4 sm:px-8">
        {varias ? (
          <ReclamacaoFotoLightboxBotao
            icon="chevron_left"
            label="Foto anterior"
            onClick={() => ir(-1)}
          />
        ) : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={atual}
          alt={varias ? `Foto ${index + 1} de ${srcs.length}` : 'Foto da reclamação'}
          className="max-h-[82dvh] max-w-[min(100%,calc(100vw-8.5rem))] rounded-xl object-contain sm:max-w-[min(52rem,calc(100vw-11rem))]"
          onClick={(event) => event.stopPropagation()}
        />
        {varias ? (
          <ReclamacaoFotoLightboxBotao
            icon="chevron_right"
            label="Próxima foto"
            onClick={() => ir(1)}
          />
        ) : null}
      </div>

      {varias ? (
        <p className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-[rgb(28_25_23/0.72)] px-3 py-1 font-mono text-xs tabular-nums text-stone-50 ring-1 ring-white/15">
          {index + 1} / {srcs.length}
        </p>
      ) : null}
    </div>,
    document.body,
  );
}
