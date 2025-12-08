/**
 * Card de progresso compartilhado para etapas de produção
 */

import { StationQuantity } from '@/lib/utils/production-conversions';

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
        {quantityInfo.receitas && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-blue-800 font-medium">
              <strong>Total da OP:</strong> {quantityInfo.receitas.readable}
            </p>
            {realizado && (
              <p className="text-sm text-blue-800 font-medium">
                <strong>{realizado.label}:</strong>{' '}
                {realizado.value.toFixed(1)} {realizado.unit || ''}
              </p>
            )}
          </div>
        )}
        {!quantityInfo.receitas && hasReadable && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-blue-800 font-medium">
              <strong>Quantidade recebida:</strong> {quantityInfo.readable}
            </p>
            {realizado && (
              <p className="text-sm text-blue-800 font-medium">
                <strong>{realizado.label}:</strong>{' '}
                {realizado.value.toFixed(1)} {realizado.unit || ''}
              </p>
            )}
          </div>
        )}
        {restante && restante.value > 0 && (
          <p className="text-sm text-blue-800 font-medium">
            <strong>{restante.label}:</strong> {restante.value.toFixed(1)}{' '}
            {restante.unit || ''}
          </p>
        )}
        {completo && (
          <p className="text-sm text-green-700 font-medium">
            ✓ Quantidade completa!
          </p>
        )}
        {quantityInfo.assadeiras && (
          <p className="text-sm text-blue-800 font-medium mt-1">
            <strong>Assadeiras estimadas:</strong> {quantityInfo.assadeiras.readable}
          </p>
        )}
        {quantityInfo.unidades && (
          <p className="text-sm text-blue-800 font-medium mt-1">
            <strong>Unidades estimadas:</strong> {quantityInfo.unidades.readable}
          </p>
        )}
      </div>
    </div>
  );
}

