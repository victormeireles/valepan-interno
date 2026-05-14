'use client';

import { QuantityBreakdownEntry } from '@/domain/valueObjects/QuantityBreakdown';
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

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-row items-stretch gap-2 min-w-0">
        <button
          type="button"
          className="
            inline-flex items-center justify-center shrink-0
            min-h-11 min-w-11 rounded-lg text-gray-300
            hover:bg-gray-700/40
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500
          "
          aria-expanded={expanded}
          aria-controls={panelId}
          aria-label={ariaLabel}
          onClick={() => setExpanded((v) => !v)}
        >
          <span
            className={`
              material-icons text-2xl transition-transform duration-200
              motion-reduce:transition-none
              ${expanded ? 'rotate-90' : ''}
            `}
            aria-hidden={true}
          >
            chevron_right
          </span>
        </button>
        <div className="flex-1 min-w-0">
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
          />
        </div>
      </div>
      <div
        id={panelId}
        role="region"
        aria-label={`Lotes de ${produto}`}
        className="ml-11 border-l border-gray-700 pl-3 flex flex-col gap-1"
        hidden={!expanded}
      >
        {expanded ? renderLots() : null}
      </div>
    </div>
  );
}
