'use client';

import type { QuantityBreakdownEntry } from '@/domain/valueObjects/QuantityBreakdown';
import { ReactNode, useId, useState } from 'react';
import ProductCompactCard from './ProductCompactCard';

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
}: EmbalagemProductAccordionProps) {
  const [expanded, setExpanded] = useState(false);
  const reactId = useId();
  const safeInstanceId = sanitizeForHtmlId(instanceId);
  const panelId = `${safeInstanceId}-lots-${reactId}`;

  const ariaLabel = expanded
    ? `Recolher lotes de ${produto}`
    : `Expandir lotes de ${produto}`;

  const expandButton = (
    <button
      type="button"
      className="
        inline-flex items-center justify-center
        min-h-11 min-w-11 shrink-0 rounded-md text-gray-300
        hover:bg-gray-700/50
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500
      "
      aria-expanded={expanded}
      aria-controls={panelId}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation();
        setExpanded((v) => !v);
      }}
    >
      <span className="material-icons text-2xl motion-reduce:transition-none" aria-hidden>
        {expanded ? 'expand_more' : 'chevron_right'}
      </span>
    </button>
  );

  return (
    <div className="flex flex-col gap-1">
      <ProductCompactCard
        produto={produto}
        produzido={somaProduzido}
        aProduzir={somaAProduzir}
        unidade={unidade}
        congelado={congelado}
        hasPhoto={false}
        interactive={false}
        detalhesProduzido={detalhesProduzido}
        detalhesMeta={detalhesMeta}
        horarioEmbalagem={horarioEmbalagem}
        trailingSlot={expandButton}
      />
      <div
        id={panelId}
        role="region"
        aria-label={`Lotes de ${produto}`}
        className="border-l border-gray-700 pl-3 ml-1 flex flex-col gap-1"
        hidden={!expanded}
      >
        {expanded ? renderLots() : null}
      </div>
    </div>
  );
}
