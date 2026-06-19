'use client';

import type { ReactNode } from 'react';
import { IconButton } from '@/components/ui/IconButton';
import type { QuantityBreakdownEntry } from '@/domain/valueObjects/QuantityBreakdown';
import { QuantityBreakdown } from '@/domain/valueObjects/QuantityBreakdown';

type EmbalagemLoteRowProps = {
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

export default function EmbalagemLoteRow({
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
}: EmbalagemLoteRowProps) {
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

export function formatLoteProduzidoLabel(
  detalhes: QuantityBreakdownEntry[],
  fallbackUnit?: string,
): string {
  return new QuantityBreakdown(detalhes).format(
    detalhes.reduce((s, e) => s + e.quantidade, 0),
    fallbackUnit,
  );
}
