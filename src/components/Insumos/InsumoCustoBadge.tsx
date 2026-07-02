'use client';

import { Badge } from '@/components/ui/Badge';
import { resolveInsumoCustoEstado } from '@/domain/insumos/insumo-custo-estado';

type Props = {
  custoUnitario: number | null | undefined;
  className?: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function InsumoCustoBadge({ custoUnitario, className = '' }: Props) {
  const estado = resolveInsumoCustoEstado(custoUnitario);

  if (estado === 'pendente') {
    return (
      <Badge tone="warning" className={className}>
        Custo pendente
      </Badge>
    );
  }

  if (estado === 'sem_custo') {
    return (
      <Badge tone="neutral" className={className}>
        Sem custo
      </Badge>
    );
  }

  return (
    <span className={`font-mono text-sm tabular-nums text-stone-700 ${className}`}>
      {formatCurrency(custoUnitario as number)}
    </span>
  );
}
