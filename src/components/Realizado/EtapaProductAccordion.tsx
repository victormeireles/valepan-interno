'use client';

import { ReactNode, useId, useState } from 'react';
import type { ProductionStatus } from '@/domain/types/realizado';
import type { QuantityBreakdownEntry } from '@/domain/valueObjects/QuantityBreakdown';
import ProductCompactCard from './ProductCompactCard';

export interface EtapaProductAccordionProps {
  instanceId: string;
  produto: string;
  cliente?: string;
  assadeiraNome?: string;
  observacao?: string;
  somaProduzido: number;
  somaAProduzir: number;
  unidade: string;
  detalhesProduzido: QuantityBreakdownEntry[];
  detalhesMeta: QuantityBreakdownEntry[];
  horarioProducao?: string;
  renderLots: () => ReactNode;
  productionStatusOverride?: ProductionStatus;
  onNovoLote?: () => void;
  isNovoLoteLoading?: boolean;
}

function sanitizeForHtmlId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-');
}

export default function EtapaProductAccordion({
  instanceId,
  produto,
  cliente,
  assadeiraNome,
  observacao,
  somaProduzido,
  somaAProduzir,
  unidade,
  detalhesProduzido,
  detalhesMeta,
  horarioProducao,
  renderLots,
  productionStatusOverride,
  onNovoLote,
  isNovoLoteLoading = false,
}: EtapaProductAccordionProps) {
  const [expanded, setExpanded] = useState(false);
  const reactId = useId();
  const safeInstanceId = sanitizeForHtmlId(instanceId);
  const panelId = `${safeInstanceId}-lots-${reactId}`;

  const trailingActions = (
    <div className="flex items-center shrink-0">
      {onNovoLote ? (
        <button
          type="button"
          className="
            inline-flex items-center justify-center
            min-h-11 min-w-11 rounded-md text-amber-400
            hover:bg-gray-700/50
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500
            disabled:opacity-60 disabled:cursor-wait
          "
          aria-label={
            isNovoLoteLoading
              ? `Abrindo novo lote de ${produto}...`
              : `Novo lote de ${produto}`
          }
          aria-busy={isNovoLoteLoading}
          disabled={isNovoLoteLoading}
          onClick={(e) => {
            e.stopPropagation();
            onNovoLote();
          }}
        >
          {isNovoLoteLoading ? (
            <span
              className="inline-block h-5 w-5 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin motion-reduce:animate-none"
              aria-hidden
            />
          ) : (
            <span className="material-icons text-2xl" aria-hidden>
              add
            </span>
          )}
        </button>
      ) : null}
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
        aria-label={expanded ? `Recolher lotes de ${produto}` : `Expandir lotes de ${produto}`}
        onClick={(e) => {
          e.stopPropagation();
          setExpanded((v) => !v);
        }}
      >
        <span className="material-icons text-2xl motion-reduce:transition-none" aria-hidden>
          {expanded ? 'expand_more' : 'chevron_right'}
        </span>
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-1">
      <ProductCompactCard
        produto={produto}
        cliente={cliente}
        assadeiraNome={assadeiraNome}
        clienteAsBadge
        observacao={observacao}
        produzido={somaProduzido}
        aProduzir={somaAProduzir}
        unidade={unidade}
        hasPhoto={false}
        interactive={false}
        detalhesProduzido={detalhesProduzido}
        detalhesMeta={detalhesMeta}
        horarioEmbalagem={horarioProducao}
        trailingSlot={trailingActions}
        productionStatusOverride={productionStatusOverride}
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
