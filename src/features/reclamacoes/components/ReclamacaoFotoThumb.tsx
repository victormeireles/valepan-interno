'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReclamacaoFotoRecord } from '@/domain/reclamacoes/reclamacao-types';
import { posicaoMiniaturaFoto } from '@/features/reclamacoes/components/reclamacao-foto-miniatura-posicao';
import { ReclamacaoFotoLightbox } from '@/features/reclamacoes/components/ReclamacaoFotoLightbox';

type Props = {
  fotos: ReclamacaoFotoRecord[];
};

export function ReclamacaoFotoThumb({ fotos }: Props) {
  const srcs = fotos.map((foto) => foto.signedUrl).filter((url): url is string => Boolean(url));
  const [preview, setPreview] = useState<{ top: number; left: number } | null>(null);
  const [aberto, setAberto] = useState(false);
  const primeira = fotos[0];

  if (!primeira) return null;

  const src = primeira.signedUrl;

  const showPreview = (element: HTMLElement) => {
    if (!src) return;
    setPreview(posicaoMiniaturaFoto(element.getBoundingClientRect()));
  };

  return (
    <>
      <button
        type="button"
        className="relative inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-stone-500 transition-colors duration-150 hover:bg-stone-100 hover:text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
        aria-label={fotos.length > 1 ? `Ver ${fotos.length} fotos` : 'Ver foto'}
        onMouseEnter={(event) => showPreview(event.currentTarget)}
        onMouseLeave={() => setPreview(null)}
        onFocus={(event) => showPreview(event.currentTarget)}
        onBlur={() => setPreview(null)}
        onClick={(event) => {
          event.stopPropagation();
          if (srcs.length > 0) {
            setPreview(null);
            setAberto(true);
          }
        }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 rounded-md object-cover"
          />
        ) : (
          <span className="material-icons text-xl" aria-hidden>
            photo
          </span>
        )}
        {fotos.length > 1 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-600 px-1 font-mono text-[10px] font-semibold tabular-nums text-white">
            {fotos.length}
          </span>
        ) : null}
      </button>
      {preview && src
        ? createPortal(
            <div
              aria-hidden="true"
              style={{ top: preview.top, left: preview.left }}
              className="pointer-events-none fixed z-[70] overflow-hidden rounded-xl border border-stone-200 bg-white shadow-[0_12px_24px_-6px_rgb(28_25_23/0.18)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                width={176}
                height={176}
                className="h-44 w-44 object-cover"
              />
            </div>,
            document.body,
          )
        : null}
      {aberto ? (
        <ReclamacaoFotoLightbox srcs={srcs} onClose={() => setAberto(false)} />
      ) : null}
    </>
  );
}
