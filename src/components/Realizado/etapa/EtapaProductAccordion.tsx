'use client';

import { type ReactNode, useId, useState } from 'react';
import { Card } from '@/components/ui/Card';
import type { QuantityBreakdownEntry } from '@/domain/valueObjects/QuantityBreakdown';
import { QuantityBreakdown } from '@/domain/valueObjects/QuantityBreakdown';
import type { ProductionStatus } from '@/domain/types/realizado';
import EtapaProductCardHeader from './EtapaProductCardHeader';
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
  const subtitle =
    subParts.length > 0 ? (
      <div className="mt-0.5 flex items-start gap-2 text-text-muted">
        <span className="material-icons mt-px text-[13px] text-stone-400" aria-hidden="true">
          schedule
        </span>
        <span className="font-mono text-xs leading-snug tabular-nums">{subParts.join('  ·  ')}</span>
      </div>
    ) : null;

  return (
    <Card padding="none" className="overflow-hidden shadow-control">
      <EtapaProductCardHeader
        produto={produto}
        styles={styles}
        congelado={congelado}
        hasPhoto={hasPhoto}
        onProductPhotoClick={onProductPhotoClick}
        subtitle={subtitle}
        producedLabel={producedLabel}
        targetLabel={targetLabel}
        hasMeta={hasMeta}
        pct={pct}
        onNovoLote={onNovoLote}
        addLabel={addLabel}
        isNovoLoteLoading={isNovoLoteLoading}
        expanded={expanded}
        panelId={panelId}
        onToggleExpanded={() => setExpanded((v) => !v)}
      />

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
