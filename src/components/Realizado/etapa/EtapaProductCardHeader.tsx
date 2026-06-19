'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';

type EtapaStatusStyles = {
  border: string;
  dot: string;
  fill: string;
};

export type EtapaProductCardHeaderProps = {
  produto: string;
  styles: EtapaStatusStyles;
  congelado?: boolean;
  hasPhoto?: boolean;
  onProductPhotoClick?: () => void;
  subtitle?: ReactNode;
  producedLabel: string;
  targetLabel: string;
  hasMeta?: boolean;
  pct: number;
  onNovoLote?: () => void;
  addLabel?: string;
  isNovoLoteLoading?: boolean;
  expanded: boolean;
  panelId: string;
  onToggleExpanded: () => void;
};

function ProductBadges({
  congelado,
  hasPhoto,
  onProductPhotoClick,
}: Pick<EtapaProductCardHeaderProps, 'congelado' | 'hasPhoto' | 'onProductPhotoClick'>) {
  return (
    <>
      {congelado ? (
        <span
          className="material-icons shrink-0 text-base text-sky-500"
          title="Congelado"
          aria-label="Congelado"
        >
          ac_unit
        </span>
      ) : null}
      {hasPhoto ? (
        onProductPhotoClick ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onProductPhotoClick();
            }}
            className="material-icons shrink-0 text-base text-amber-600"
            title="Ver foto"
            aria-label="Ver foto do produto"
          >
            photo_camera
          </button>
        ) : (
          <span
            className="material-icons shrink-0 text-base text-amber-600"
            title="Tem foto"
            aria-hidden="true"
          >
            photo_camera
          </span>
        )
      ) : null}
    </>
  );
}

function QuantityBlock({
  hasMeta,
  producedLabel,
  targetLabel,
  pct,
  fillClass,
}: {
  hasMeta: boolean;
  producedLabel: string;
  targetLabel: string;
  pct: number;
  fillClass: string;
}) {
  if (!hasMeta) {
    return (
      <p className="font-mono text-sm font-semibold tabular-nums text-text-strong">{producedLabel}</p>
    );
  }

  return (
    <div className="min-w-0">
      <p className="font-mono text-sm tabular-nums">
        <strong className="text-text-strong">{producedLabel}</strong>
        <span className="mx-1 text-stone-400">/</span>
        <span className="text-text-muted">{targetLabel}</span>
      </p>
      <div className="mt-1.5 h-[5px] w-full overflow-hidden rounded-full bg-stone-100">
        <div
          className={['h-full rounded-full transition-[width] duration-[240ms]', fillClass].join(' ')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function EtapaProductCardHeader({
  produto,
  styles,
  congelado,
  hasPhoto,
  onProductPhotoClick,
  subtitle,
  producedLabel,
  targetLabel,
  hasMeta = true,
  pct,
  onNovoLote,
  addLabel = 'Lote',
  isNovoLoteLoading = false,
  expanded,
  panelId,
  onToggleExpanded,
}: EtapaProductCardHeaderProps) {
  return (
    <div className={['flex gap-2.5 border-l-[3px] py-2.5 pr-3', styles.border].join(' ')}>
      <span
        className={['ml-[13px] mt-[7px] h-[9px] w-[9px] shrink-0 self-start rounded-full', styles.dot].join(
          ' ',
        )}
        aria-hidden="true"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
              <span className="text-base font-semibold leading-snug tracking-[-0.004em] text-text-strong">
                {produto}
              </span>
              <ProductBadges
                congelado={congelado}
                hasPhoto={hasPhoto}
                onProductPhotoClick={onProductPhotoClick}
              />
            </div>
            {subtitle}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {onNovoLote ? (
              <Button
                size="md"
                icon="add"
                disabled={isNovoLoteLoading}
                onClick={(e) => {
                  e.stopPropagation();
                  onNovoLote();
                }}
                className="shrink-0"
                aria-label={`${addLabel} de ${produto}`}
              >
                <span className="max-[520px]:sr-only">{addLabel}</span>
              </Button>
            ) : null}

            <IconButton
              size="md"
              icon={expanded ? 'expand_more' : 'chevron_right'}
              label={expanded ? `Recolher lotes de ${produto}` : `Ver lotes de ${produto}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpanded();
              }}
              aria-expanded={expanded}
              aria-controls={panelId}
            />
          </div>
        </div>

        <QuantityBlock
          hasMeta={hasMeta}
          producedLabel={producedLabel}
          targetLabel={targetLabel}
          pct={pct}
          fillClass={styles.fill}
        />
      </div>
    </div>
  );
}
