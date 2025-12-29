/**
 * Card de progresso compartilhado para etapas de produção
 */

import { StationQuantity } from '@/lib/utils/production-conversions';
import { formatNumberWithThousands } from '@/lib/utils/number-utils';

interface ProductionProgressCardProps {
  quantityInfo: StationQuantity;
  realizado?: {
    label: string;
    value: number;
    unit?: string;
  };
  restante?: {
    label: string;
    value: number;
    unit?: string;
  };
  completo?: boolean;
}

// Formatar receitas com no máximo 1 casa decimal
function formatarReceita(valor: number): string {
  const parteDecimal = Math.abs(valor % 1);
  if (parteDecimal < 0.001) {
    return Math.round(valor).toString();
  }
  return formatNumberWithThousands(valor, { 
    minimumFractionDigits: 0,
    maximumFractionDigits: 1 
  });
}

export default function ProductionProgressCard({
  quantityInfo,
  realizado,
  restante,
  completo,
}: ProductionProgressCardProps) {
  // Verificar se há conteúdo para exibir
  const hasReceitas = quantityInfo.receitas !== undefined;
  const hasAssadeiras = quantityInfo.assadeiras !== undefined;
  const hasUnidades = quantityInfo.unidades !== undefined;
  const hasRealizado = realizado !== undefined;
  const hasRestante = restante !== undefined && restante.value > 0;
  const hasCompleto = completo === true;
  const hasReadable = quantityInfo.readable && quantityInfo.value > 0;

  // Se não houver nenhum conteúdo, não renderizar o card
  if (!hasReceitas && !hasAssadeiras && !hasUnidades && !hasRealizado && !hasRestante && !hasCompleto && !hasReadable) {
    return null;
  }

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
      <div className="space-y-2">
        {/* Linha 1: OP: receitas / assadeiras / unidades */}
        {quantityInfo.receitas && (
          <div className="flex items-center gap-2 text-sm text-blue-800 font-medium">
            <strong>OP:</strong>
            <span>{quantityInfo.receitas.readable}</span>
            {quantityInfo.assadeiras && (
              <>
                <span className="text-blue-600">/</span>
                <span>{quantityInfo.assadeiras.readable}</span>
              </>
            )}
            {quantityInfo.unidades && (
              <>
                <span className="text-blue-600">/</span>
                <span>{quantityInfo.unidades.readable}</span>
              </>
            )}
          </div>
        )}
        
        {/* Linha 2: Já realizado */}
        {realizado && (
          <div className="text-sm text-blue-800 font-medium">
            <strong>Já realizado:</strong>{' '}
            {formatarReceita(realizado.value)} {realizado.unit || ''}
          </div>
        )}
        
        {/* Fallback para quando não há receitas */}
        {!quantityInfo.receitas && hasReadable && (
          <div className="text-sm text-blue-800 font-medium">
            <strong>Quantidade recebida:</strong> {quantityInfo.readable}
          </div>
        )}
        
        {restante && restante.value > 0 && (
          <p className="text-sm text-blue-800 font-medium">
            <strong>{restante.label}:</strong> {formatarReceita(restante.value)}{' '}
            {restante.unit || ''}
          </p>
        )}
        
        {completo && (
          <p className="text-sm text-green-700 font-medium">
            ✓ Quantidade completa!
          </p>
        )}
      </div>
    </div>
  );
}

