'use client';

import { type ReactNode, useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Card } from '@/components/ui/Card';
import type { QuantityBreakdownEntry } from '@/domain/valueObjects/QuantityBreakdown';
import { QuantityBreakdown } from '@/domain/valueObjects/QuantityBreakdown';
import type { ProductionStatus } from '@/domain/types/realizado';
import { etapaStatusStyles, getEtapaProductionStatus } from './etapa-status';

export type EtapaProductAccordionProps = {
  instanceId: string;
  produto: string;
  somaProduzido: number;
  somaAProduzir: number;
  unidade: string;
  congelado?: boolean;
  assadeira?: string;
  hasPhoto?: boolean;
  detalhesProduzido: QuantityBreakdownEntry[];
  detalhesMeta: QuantityBreakdownEntry[];
  horario?: string;
  renderLots: () => ReactNode;
  productionStatusOverride?: ProductionStatus;
  onNovoLote?: () => void;
  addLabel?: string;
  isNovoLoteLoading?: boolean;
  /** Sem meta: oculta barra e "/ meta"; farol pendente/registrado */
  hasMeta?: boolean;
  onProductPhotoClick?: () => void;
};

function sanitizeForHtmlId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-');
}

export default function EtapaProductAccordion({
  instanceId,
  produto,
  somaProduzido,
  somaAProduzir,
  unidade,
  congelado,
  assadeira,
  hasPhoto,
  detalhesProduzido,
  detalhesMeta,
  horario,
  renderLots,
  productionStatusOverride,
  onNovoLote,
  addLabel = 'Lote',
  isNovoLoteLoading = false,
  hasMeta = true,
  onProductPhotoClick,
}: EtapaProductAccordionProps) {
  const [expanded, setExpanded] = useState(false);
  const reactId = useId();
  const panelId = `${sanitizeForHtmlId(instanceId)}-lots-${reactId}`;

  const status = hasMeta
    ? getEtapaProductionStatus(somaProduzido, somaAProduzir, productionStatusOverride)
    : productionStatusOverride ??
      (somaProduzido > 0 ? 'complete' : 'not-started');
  const styles = etapaStatusStyles(status);
  const pct =
    hasMeta && somaAProduzir > 0
      ? Math.min(100, Math.round((somaProduzido / somaAProduzir) * 100))
      : 0;

  const producedBreakdown = new QuantityBreakdown(detalhesProduzido);
  const targetBreakdown = new QuantityBreakdown(detalhesMeta);
  const fallbackUnit = unidade ? unidade.toLowerCase() : undefined;
  const producedLabel = producedBreakdown.format(somaProduzido, fallbackUnit);
  const targetLabel = targetBreakdown.format(somaAProduzir, fallbackUnit);

  const subParts = [horario, assadeira ? `Assadeira ${assadeira}` : null].filter(Boolean);

  return (
    <Card padding="none" className="overflow-hidden shadow-control">
      <div
        className={[
          'flex items-center gap-3 border-l-[3px] py-2.5 pr-3',
          styles.border,
        ].join(' ')}
      >
        <span
          className={['ml-[13px] h-[9px] w-[9px] shrink-0 rounded-full', styles.dot].join(' ')}
          aria-hidden="true"
        />

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="min-w-0 shrink basis-[38%] sm:basis-[42%] sm:max-w-[52%]">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-base font-semibold tracking-[-0.004em] text-text-strong">
                {produto}
              </span>
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
            </div>
            {subParts.length > 0 ? (
              <div className="mt-0.5 flex items-center gap-2 text-text-muted">
                <span className="material-icons text-[13px] text-stone-400" aria-hidden="true">
                  schedule
                </span>
                <span className="font-mono text-xs tabular-nums">{subParts.join('  ·  ')}</span>
              </div>
            ) : null}
          </div>

          <div className="min-w-0 flex-1 text-right">
            {hasMeta ? (
              <>
                <p
                  className="truncate font-mono text-sm tabular-nums"
                  title={`${producedLabel} / ${targetLabel}`}
                >
                  <strong className="text-text-strong">{producedLabel}</strong>
                  <span className="mx-1 text-stone-400">/</span>
                  <span className="text-text-muted">{targetLabel}</span>
                </p>
                <div className="mt-1.5 h-[5px] w-full overflow-hidden rounded-full bg-stone-100">
                  <div
                    className={[
                      'h-full rounded-full transition-[width] duration-[240ms]',
                      styles.fill,
                    ].join(' ')}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </>
            ) : (
              <p className="truncate font-mono text-sm font-semibold tabular-nums text-text-strong">
                {producedLabel}
              </p>
            )}
          </div>
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
              setExpanded((v) => !v);
            }}
            aria-expanded={expanded}
            aria-controls={panelId}
          />
        </div>
      </div>

      {expanded ? (
        <div
          id={panelId}
          role="region"
          aria-label={`Lotes de ${produto}`}
          className="border-t border-stone-100 bg-stone-50 px-3 py-2 pl-[1.625rem]"
        >
          {renderLots()}
        </div>
      ) : null}
    </Card>
  );
}
