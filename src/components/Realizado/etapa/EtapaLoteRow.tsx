'use client';

import type { ReactNode } from 'react';
import { IconButton } from '@/components/ui/IconButton';
import type { EtapaLotePhotoLink } from './types';

type EtapaLoteRowProps = {
  index: number;
  produzidoLabel: string;
  horario?: string;
  hasPhoto?: boolean;
  photoColor?: 'white' | 'yellow' | 'red';
  onPhotoClick?: () => void;
  onEdit?: () => void;
  editLabel?: string;
  isLoading?: boolean;
  trailingSlot?: ReactNode;
  isLast?: boolean;
};

export default function EtapaLoteRow({
  index,
  produzidoLabel,
  horario,
  hasPhoto,
  photoColor = 'white',
  onPhotoClick,
  onEdit,
  editLabel,
  isLoading = false,
  trailingSlot,
  isLast = false,
}: EtapaLoteRowProps) {
  const photoClass =
    photoColor === 'yellow'
      ? 'text-amber-600'
      : photoColor === 'red'
        ? 'text-danger'
        : 'text-stone-400';

  return (
    <div
      className={[
        'flex items-center gap-2 py-1.5',
        !isLast ? 'border-b border-stone-100' : '',
        isLoading ? 'opacity-60' : '',
      ].join(' ')}
    >
      <span className="material-icons text-lg text-success" aria-hidden="true">
        check_circle
      </span>
      <span className="min-w-0 flex-1 text-sm text-stone-700">Lote {index}</span>
      {hasPhoto ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPhotoClick?.();
          }}
          className={`material-icons text-base ${photoClass}`}
          aria-label="Ver fotos do lote"
        >
          photo_camera
        </button>
      ) : null}
      <span className="font-mono text-sm font-semibold tabular-nums text-text-strong">
        {produzidoLabel}
      </span>
      <span className="w-11 text-right font-mono text-xs tabular-nums text-text-muted">
        {horario ?? '—'}
      </span>
      <div className="flex shrink-0 items-center gap-0.5">
        {onEdit ? (
          <IconButton
            size="sm"
            icon="edit"
            label={editLabel ?? `Editar lote ${index}`}
            disabled={isLoading}
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          />
        ) : null}
        {trailingSlot}
      </div>
    </div>
  );
}

type EtapaPhotoDropdownProps = {
  links: EtapaLotePhotoLink[];
  onClose: () => void;
};

export function EtapaPhotoDropdown({ links, onClose }: EtapaPhotoDropdownProps) {
  if (links.length === 0) return null;

  return (
    <div className="absolute left-0 top-full z-50 mt-1 min-w-[200px] rounded-[9px] border border-border-default bg-surface py-2 shadow-control">
      {links.map((link) => (
        <a
          key={link.url}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 text-sm text-stone-700 transition-colors hover:bg-stone-50"
          onClick={onClose}
        >
          {link.emoji ? <span className="text-sm">{link.emoji}</span> : null}
          <span>{link.label}</span>
        </a>
      ))}
    </div>
  );
}
