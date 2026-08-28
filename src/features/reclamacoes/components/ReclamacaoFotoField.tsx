'use client';

import { useEffect, useMemo, useState } from 'react';
import { IconButton } from '@/components/ui/IconButton';
import { RECLAMACAO_MAX_FOTOS } from '@/domain/reclamacoes/reclamacao-fotos-limite';
import type { ReclamacaoFotoRecord } from '@/domain/reclamacoes/reclamacao-types';

type Props = {
  existentes: ReclamacaoFotoRecord[];
  fotoIdsRemovidos: string[];
  novos: File[];
  onRemovidosChange: (ids: string[]) => void;
  onNovosChange: (files: File[]) => void;
};

type Miniatura = {
  key: string;
  src: string;
  onRemove: () => void;
};

export default function ReclamacaoFotoField({
  existentes,
  fotoIdsRemovidos,
  novos,
  onRemovidosChange,
  onNovosChange,
}: Props) {
  const [ampliada, setAmpliada] = useState<string | null>(null);
  const visiveis = existentes.filter((f) => !fotoIdsRemovidos.includes(f.id));
  const restantes = RECLAMACAO_MAX_FOTOS - visiveis.length - novos.length;

  const novosUrls = useMemo(
    () => novos.map((file) => URL.createObjectURL(file)),
    [novos],
  );

  useEffect(() => {
    return () => {
      novosUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [novosUrls]);

  const miniaturas: Miniatura[] = [
    ...visiveis.map((foto) => ({
      key: foto.id,
      src: foto.signedUrl ?? '',
      onRemove: () => onRemovidosChange([...fotoIdsRemovidos, foto.id]),
    })),
    ...novos.map((file, index) => ({
      key: `novo-${file.name}-${index}`,
      src: novosUrls[index] ?? '',
      onRemove: () => onNovosChange(novos.filter((_, i) => i !== index)),
    })),
  ];

  const appendFiles = (fileList: FileList | null) => {
    if (!fileList || restantes <= 0) return;
    const images = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    onNovosChange([...novos, ...images.slice(0, restantes)]);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium tracking-[-0.004em] text-stone-700">Fotos</p>
      <div className="flex flex-wrap gap-2">
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[9px] border border-border-default bg-surface px-3.5 text-sm font-medium text-stone-700 shadow-control">
          <span className="material-icons text-[17px]" aria-hidden="true">
            add_photo_alternate
          </span>
          Anexar
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            disabled={restantes <= 0}
            onChange={(event) => {
              appendFiles(event.target.files);
              event.target.value = '';
            }}
          />
        </label>
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[9px] border border-border-default bg-surface px-3.5 text-sm font-medium text-stone-700 shadow-control">
          <span className="material-icons text-[17px]" aria-hidden="true">
            photo_camera
          </span>
          Câmera
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            disabled={restantes <= 0}
            onChange={(event) => {
              appendFiles(event.target.files);
              event.target.value = '';
            }}
          />
        </label>
      </div>
      <p className="text-xs text-text-muted">
        Opcional. Até {RECLAMACAO_MAX_FOTOS} fotos.
      </p>

      {miniaturas.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {miniaturas.map((item) => (
            <li key={item.key} className="relative">
              <button
                type="button"
                className="block h-20 w-20 overflow-hidden rounded-xl border border-stone-200 bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                onClick={() => {
                  if (item.src) setAmpliada(item.src);
                }}
                aria-label="Ampliar foto"
              >
                {item.src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.src} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="material-icons text-3xl text-stone-300">photo</span>
                )}
              </button>
              <div className="absolute -right-1 -top-1">
                <IconButton
                  icon="close"
                  label="Remover foto"
                  size="lg"
                  variant="solid"
                  onClick={item.onRemove}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {ampliada ? (
        <dialog
          open
          className="fixed inset-0 z-[80] flex h-full max-h-none w-full max-w-none items-center justify-center bg-stone-900/70 p-4"
          onClick={() => setAmpliada(null)}
          onCancel={() => setAmpliada(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ampliada}
            alt="Foto da reclamação"
            className="max-h-[90dvh] max-w-full rounded-xl object-contain"
          />
        </dialog>
      ) : null}
    </div>
  );
}
