'use client';

import { ReactNode, useId, useState } from 'react';
import { Card } from '@/components/ui/Card';
import type { ProductionStatus } from '@/domain/types/realizado';
import type { QuantityBreakdownEntry } from '@/domain/valueObjects/QuantityBreakdown';
import { QuantityBreakdown } from '@/domain/valueObjects/QuantityBreakdown';
import EtapaProductCardHeader from './etapa/EtapaProductCardHeader';
import {
  embalagemStatusStyles,
  getEmbalagemProductionStatus,
} from './embalagem/embalagem-status';

export interface EmbalagemProductAccordionProps {
  instanceId: string;
  produto: string;
  somaProduzido: number;
  somaAProduzir: number;
  unidade: string;
  congelado: boolean;
  detalhesProduzido: QuantityBreakdownEntry[];
  detalhesMeta: QuantityBreakdownEntry[];
  horarioEmbalagem?: string;
  renderLots: () => ReactNode;
  productionStatusOverride?: ProductionStatus;
  onNovoLote?: () => void;
  isNovoLoteLoading?: boolean;
}

function sanitizeForHtmlId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-');
}

export default function EmbalagemProductAccordion({
  instanceId,
  produto,
  somaProduzido,
  somaAProduzir,
  unidade,
  congelado,
  detalhesProduzido,
  detalhesMeta,
  horarioEmbalagem,
  renderLots,
  productionStatusOverride,
  onNovoLote,
  isNovoLoteLoading = false,
}: EmbalagemProductAccordionProps) {
  const [expanded, setExpanded] = useState(false);
  const reactId = useId();
  const panelId = `${sanitizeForHtmlId(instanceId)}-lots-${reactId}`;

  const status = getEmbalagemProductionStatus(
    somaProduzido,
    somaAProduzir,
    productionStatusOverride,
  );
  const styles = embalagemStatusStyles(status);
  const pct =
    somaAProduzir > 0 ? Math.min(100, Math.round((somaProduzido / somaAProduzir) * 100)) : 0;

  const producedBreakdown = new QuantityBreakdown(detalhesProduzido);
  const targetBreakdown = new QuantityBreakdown(detalhesMeta);
  const fallbackUnit = unidade ? unidade.toLowerCase() : undefined;
  const producedLabel = producedBreakdown.format(somaProduzido, fallbackUnit);
  const targetLabel = targetBreakdown.format(somaAProduzir, fallbackUnit);

  const subtitle = horarioEmbalagem ? (
    <div className="mt-0.5 flex items-start gap-2 text-text-muted">
      <span className="material-icons mt-px text-[13px] text-stone-400" aria-hidden="true">
        schedule
      </span>
      <span className="font-mono text-xs leading-snug tabular-nums">{horarioEmbalagem}</span>
    </div>
  ) : null;

  return (
    <Card padding="none" className="overflow-hidden shadow-control">
      <EtapaProductCardHeader
        produto={produto}
        styles={styles}
        congelado={congelado}
        subtitle={subtitle}
        producedLabel={producedLabel}
        targetLabel={targetLabel}
        hasMeta
        pct={pct}
        onNovoLote={onNovoLote}
        addLabel="Lote"
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
