'use client';

import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { resolveTipoEstoqueMarca } from '@/lib/utils/cliente-display';
import DataEtiquetaBadge from './DataEtiquetaBadge';
import TipoEstoqueMarcaBadge from './TipoEstoqueMarcaBadge';

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
  /** Assadeira, cliente inline, observação — entre produto e progresso no desktop */
  metaItems?: string[];
  /** Data da etiqueta (dd/mm) — badge destacado quando ≠ data da OP. */
  dataEtiqueta?: string;
  /** Cliente / tipo de estoque — badge D/T/V à direita do produto quando aplicável. */
  tipoEstoqueCliente?: string;
  showTipoEstoqueMarcaBadge?: boolean;
  horario?: string;
  producedLabel: string;
  targetLabel: string;
  metaOpLabel?: string;
  hasMeta?: boolean;
  pct: number;
  onNovoLote?: () => void;
  addLabel?: string;
  onReabrirOp?: () => void;
  reabrirLabel?: string;
  isNovoLoteLoading?: boolean;
  isReabrindoOp?: boolean;
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

function ProductTitle({
  produto,
  tipoEstoqueCliente,
  showTipoEstoqueMarcaBadge = false,
  dataEtiqueta,
  congelado,
  hasPhoto,
  onProductPhotoClick,
}: {
  produto: string;
  tipoEstoqueCliente?: string;
  showTipoEstoqueMarcaBadge?: boolean;
  dataEtiqueta?: string;
  congelado?: boolean;
  hasPhoto?: boolean;
  onProductPhotoClick?: () => void;
}) {
  const marca =
    showTipoEstoqueMarcaBadge && tipoEstoqueCliente
      ? resolveTipoEstoqueMarca(tipoEstoqueCliente)
      : null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-base font-semibold leading-snug tracking-[-0.004em] text-text-strong">
        {produto}
      </span>
      {marca ? <TipoEstoqueMarcaBadge marca={marca} /> : null}
      <ProductBadges
        congelado={congelado}
        hasPhoto={hasPhoto}
        onProductPhotoClick={onProductPhotoClick}
      />
      {dataEtiqueta ? <DataEtiquetaBadge data={dataEtiqueta} /> : null}
    </div>
  );
}

function CardActions({
  produto,
  onNovoLote,
  addLabel,
  onReabrirOp,
  reabrirLabel = 'Reabrir OP',
  isNovoLoteLoading,
  isReabrindoOp,
  expanded,
  panelId,
  onToggleExpanded,
}: Pick<
  EtapaProductCardHeaderProps,
  | 'produto'
  | 'onNovoLote'
  | 'addLabel'
  | 'onReabrirOp'
  | 'reabrirLabel'
  | 'isNovoLoteLoading'
  | 'isReabrindoOp'
  | 'expanded'
  | 'panelId'
  | 'onToggleExpanded'
>) {
  return (
    <>
      {onReabrirOp ? (
        <Button
          size="md"
          variant="secondary"
          icon="replay"
          disabled={isReabrindoOp || isNovoLoteLoading}
          onClick={(e) => {
            e.stopPropagation();
            onReabrirOp();
          }}
          className="shrink-0"
          aria-label={`${reabrirLabel} — ${produto}`}
        >
          <span className="max-[520px]:sr-only">{reabrirLabel}</span>
        </Button>
      ) : null}

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
    </>
  );
}

function HorarioLabel({ horario, showIcon = false }: { horario: string; showIcon?: boolean }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 font-mono text-xs tabular-nums text-text-muted"
      title="Horário do último registro"
    >
      {showIcon ? (
        <span className="material-icons text-[13px] text-stone-400" aria-hidden="true">
          schedule
        </span>
      ) : null}
      {horario}
    </span>
  );
}

function MetaLine({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <p className="truncate text-xs leading-snug text-text-muted" title={items.join(' · ')}>
      {items.join(' · ')}
    </p>
  );
}

function QuantityBlock({
  hasMeta,
  producedLabel,
  targetLabel,
  metaOpLabel,
  pct,
  fillClass,
  align = 'left',
  className = '',
}: {
  hasMeta: boolean;
  producedLabel: string;
  targetLabel: string;
  metaOpLabel?: string;
  pct: number;
  fillClass: string;
  align?: 'left' | 'right';
  className?: string;
}) {
  const textAlign = align === 'right' ? 'text-right' : '';

  if (!hasMeta) {
    return (
      <p
        className={[
          'font-mono text-sm font-semibold leading-snug tabular-nums text-text-strong',
          textAlign,
          className,
        ].join(' ')}
      >
        {producedLabel}
      </p>
    );
  }

  return (
    <div className={[textAlign, className].join(' ')}>
      <p
        className={[
          'flex items-baseline gap-x-1.5 font-mono text-sm leading-snug tabular-nums',
          'flex-wrap sm:flex-nowrap',
          align === 'right' ? 'justify-end' : '',
        ].join(' ')}
      >
        <span className="whitespace-nowrap">
          <strong className="text-text-strong">{producedLabel}</strong>
          <span className="mx-1 text-stone-400">/</span>
          <span className="text-text-muted">{targetLabel}</span>
        </span>
        {metaOpLabel ? (
          <>
            <span className="text-stone-300" aria-hidden="true">
              ·
            </span>
            <span className="whitespace-nowrap font-sans text-[11px] text-stone-500">
              {metaOpLabel}
            </span>
          </>
        ) : null}
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
  metaItems = [],
  dataEtiqueta,
  tipoEstoqueCliente,
  showTipoEstoqueMarcaBadge = false,
  horario,
  producedLabel,
  targetLabel,
  metaOpLabel,
  hasMeta = true,
  pct,
  onNovoLote,
  addLabel = 'Lote',
  onReabrirOp,
  reabrirLabel = 'Reabrir OP',
  isNovoLoteLoading = false,
  isReabrindoOp = false,
  expanded,
  panelId,
  onToggleExpanded,
}: EtapaProductCardHeaderProps) {
  const actionProps = {
    produto,
    onNovoLote,
    addLabel,
    onReabrirOp,
    reabrirLabel,
    isNovoLoteLoading,
    isReabrindoOp,
    expanded,
    panelId,
    onToggleExpanded,
  };

  const quantityProps = {
    hasMeta,
    producedLabel,
    targetLabel,
    metaOpLabel,
    pct,
    fillClass: styles.fill,
  };

  const titleProps = {
    produto,
    tipoEstoqueCliente,
    showTipoEstoqueMarcaBadge,
    dataEtiqueta,
    congelado,
    hasPhoto,
    onProductPhotoClick,
  };

  return (
    <div className={['border-l-[3px] py-2.5 pr-3', styles.border].join(' ')}>
      {/* Mobile */}
      <div className="flex gap-2.5 sm:hidden">
        <span
          className={['ml-[13px] mt-[7px] h-[9px] w-[9px] shrink-0 self-start rounded-full', styles.dot].join(
            ' ',
          )}
          aria-hidden="true"
        />

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <ProductTitle {...titleProps} />
              {metaItems.length > 0 ? (
                <div className="mt-0.5">
                  <MetaLine items={metaItems} />
                </div>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <CardActions {...actionProps} />
            </div>
          </div>

          <div className="flex items-end justify-between gap-3">
            <QuantityBlock {...quantityProps} align="left" className="min-w-0 flex-1" />
            {horario ? <HorarioLabel horario={horario} showIcon /> : null}
          </div>
        </div>
      </div>

      {/* Desktop: produto · meta ··· progresso · hora · ações */}
      <div className="hidden items-center gap-2 sm:flex">
        <span
          className={['ml-[13px] h-[9px] w-[9px] shrink-0 rounded-full', styles.dot].join(' ')}
          aria-hidden="true"
        />

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="shrink-0">
            <ProductTitle {...titleProps} />
          </div>

          {metaItems.length > 0 ? (
            <div className="min-w-0 flex-1 overflow-hidden">
              <MetaLine items={metaItems} />
            </div>
          ) : (
            <div className="min-w-2 flex-1" aria-hidden="true" />
          )}

          <QuantityBlock
            {...quantityProps}
            align="right"
            className="w-[9.5rem] shrink-0"
          />

          {horario ? (
            <div className="w-10 shrink-0 text-right">
              <HorarioLabel horario={horario} />
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <CardActions {...actionProps} />
        </div>
      </div>
    </div>
  );
}
