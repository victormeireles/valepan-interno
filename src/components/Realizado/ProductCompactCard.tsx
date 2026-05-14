'use client';

import { getProductionStatus, getStatusColor, type ProductionStatus } from '@/domain/types/realizado';
import { QuantityBreakdown, QuantityBreakdownEntry } from '@/domain/valueObjects/QuantityBreakdown';
import type { ReactNode } from 'react';

interface ProductCompactCardProps {
  produto: string;
  produzido: number;
  aProduzir: number;
  unidade: string;
  congelado?: boolean;
  hasPhoto?: boolean;
  photoColor?: 'white' | 'yellow' | 'red';
  onPhotoClick?: () => void;
  onClick?: () => void;
  /**
   * When `false`, the card is not clickable as a whole (accordion parent).
   * Default `true` preserves current behavior.
   */
  interactive?: boolean;
  isLoading?: boolean;
  detalhesProduzido?: QuantityBreakdownEntry[];
  detalhesMeta?: QuantityBreakdownEntry[];
  observacao?: string;
  /** HH:mm (fuso local), ex.: horário da coluna Q quando há embalagem registrada */
  horarioEmbalagem?: string;
  /** Conteúdo à direita dentro do card (ex.: seta do acordeão pai). */
  trailingSlot?: ReactNode;
  /** Se definido, substitui o cálculo do farol (ex.: pai na fila não finalizada: só vermelho/amarelo). */
  productionStatusOverride?: ProductionStatus;
}

export default function ProductCompactCard({
  produto,
  produzido,
  aProduzir,
  unidade,
  congelado = false,
  hasPhoto = false,
  photoColor = 'white',
  onPhotoClick,
  onClick,
  interactive = true,
  isLoading = false,
  detalhesProduzido = [],
  detalhesMeta = [],
  observacao,
  horarioEmbalagem,
  trailingSlot,
  productionStatusOverride,
}: ProductCompactCardProps) {
  const status = productionStatusOverride ?? getProductionStatus(produzido, aProduzir);
  const statusColor = getStatusColor(status);

  const photoColorClass = {
    white: 'text-white hover:text-gray-300',
    yellow: 'text-yellow-400 hover:text-yellow-300',
    red: 'text-red-500',
  }[photoColor];

  const producedBreakdown = new QuantityBreakdown(detalhesProduzido);
  const targetBreakdown = new QuantityBreakdown(detalhesMeta);

  const fallbackUnit = unidade ? unidade.toLowerCase() : undefined;
  const producedLabel = producedBreakdown.format(produzido, fallbackUnit);
  const targetLabel = targetBreakdown.format(aProduzir, fallbackUnit);

  return (
    <div
      className={`
        relative flex items-center gap-3 px-3 py-2 rounded-lg 
        bg-gray-800/40 
        ${interactive ? 'hover:bg-gray-700/40 cursor-pointer' : 'cursor-default'}
        transition-all duration-200
        ${status === 'not-started' ? 'ring-2 ring-red-500/50' : ''}
        ${isLoading ? 'opacity-50 pointer-events-none' : ''}
      `}
      onClick={interactive ? onClick : undefined}
    >
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center rounded-lg">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        </div>
      )}

      {/* Farol de Status */}
      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${statusColor}`} />

      {/* Nome do Produto e Observação */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-sm font-semibold text-white break-words">
            {produto}
          </span>
          {congelado && (
            <span className="material-icons text-blue-300 text-xs flex-shrink-0">
              ac_unit
            </span>
          )}
        </div>
        {observacao && (
          <span className="text-xs text-gray-400 italic flex-shrink-0 whitespace-nowrap">
            {observacao}
          </span>
        )}
      </div>

      {/* Ícone de Foto */}
      {hasPhoto && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPhotoClick?.();
          }}
          className={`flex-shrink-0 ${photoColorClass} transition-colors`}
          title="Ver fotos"
        >
          <span className="material-icons text-base">photo_camera</span>
        </button>
      )}

      {horarioEmbalagem && (
        <span
          className="text-xs text-gray-400 tabular-nums flex-shrink-0"
          title="Horário registrado na embalagem"
        >
          {horarioEmbalagem}
        </span>
      )}

      {/* Produção Realizada */}
      <div className="text-sm font-bold text-white flex-shrink-0">
        {producedLabel}
      </div>

      {/* Separador */}
      <span className="text-xs text-gray-400 flex-shrink-0">/</span>

      {/* Meta de Produção */}
      <div className="text-sm text-gray-300 flex-shrink-0">
        {targetLabel}
      </div>

      {trailingSlot != null && <div className="flex shrink-0 items-center pl-1">{trailingSlot}</div>}
    </div>
  );
}

