'use client';

import { getProductionStatus, getStatusColor } from '@/domain/types/realizado';

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
  isLoading?: boolean;
  // Props adicionais para exibir detalhes de produção
  caixas?: number;
  pacotes?: number;
  unidades?: number;
  kg?: number;
  pedidoCaixas?: number;
  pedidoPacotes?: number;
  pedidoUnidades?: number;
  pedidoKg?: number;
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
  isLoading = false,
  caixas,
  pacotes,
  unidades: unidadesValue,
  kg,
  pedidoCaixas,
  pedidoPacotes,
  pedidoUnidades,
  pedidoKg,
}: ProductCompactCardProps) {
  const status = getProductionStatus(produzido, aProduzir);
  const statusColor = getStatusColor(status);

  const photoColorClass = {
    white: 'text-white hover:text-gray-300',
    yellow: 'text-yellow-400 hover:text-yellow-300',
    red: 'text-red-500',
  }[photoColor];

  // Formatar produção detalhada
  const formatProducao = () => {
    const parts = [];
    
    if (caixas && caixas > 0) {
      parts.push(`${caixas} cx`);
    }
    if (pacotes && pacotes > 0) {
      parts.push(`${pacotes} pct`);
    }
    if (unidadesValue && unidadesValue > 0) {
      parts.push(`${unidadesValue} un`);
    }
    if (kg && kg > 0) {
      parts.push(`${kg} kg`);
    }
    
    if (parts.length === 0) {
      return `${produzido} ${unidade.toLowerCase()}`;
    }
    
    return parts.join(' + ');
  };

  // Formatar meta detalhada
  const formatMeta = () => {
    const parts = [];
    
    if (pedidoCaixas && pedidoCaixas > 0) {
      parts.push(`${pedidoCaixas} cx`);
    }
    if (pedidoPacotes && pedidoPacotes > 0) {
      parts.push(`${pedidoPacotes} pct`);
    }
    if (pedidoUnidades && pedidoUnidades > 0) {
      parts.push(`${pedidoUnidades} un`);
    }
    if (pedidoKg && pedidoKg > 0) {
      parts.push(`${pedidoKg} kg`);
    }
    
    if (parts.length === 0) {
      return `${aProduzir} ${unidade.toLowerCase()}`;
    }
    
    return parts.join(' + ');
  };

  return (
    <div
      className={`
        flex items-center gap-3 px-3 py-2 rounded-lg 
        bg-gray-800/40 hover:bg-gray-700/40 
        transition-all duration-200 cursor-pointer
        ${status === 'not-started' ? 'ring-2 ring-red-500/50' : ''}
        ${isLoading ? 'opacity-50 pointer-events-none' : ''}
      `}
      onClick={onClick}
    >
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center rounded-lg">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        </div>
      )}

      {/* Farol de Status */}
      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${statusColor}`} />

      {/* Nome do Produto */}
      <div className="flex items-center gap-1 flex-1 min-w-0">
        <span className="text-sm font-semibold text-white break-words">
          {produto}
        </span>
        {congelado && (
          <span className="material-icons text-blue-300 text-xs flex-shrink-0">
            ac_unit
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

      {/* Produção Realizada */}
      <div className="text-sm font-bold text-white flex-shrink-0">
        {formatProducao()}
      </div>

      {/* Separador */}
      <span className="text-xs text-gray-400 flex-shrink-0">/</span>

      {/* Meta de Produção */}
      <div className="text-sm text-gray-300 flex-shrink-0">
        {formatMeta()}
      </div>
    </div>
  );
}

