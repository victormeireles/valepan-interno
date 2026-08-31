'use client';

import { Badge } from '@/components/ui/Badge';
import type { InsumoPedidoPipelineResumo } from '@/domain/insumos/insumo-pedido-compra-types';
import { formatPipelineBadge } from '@/features/insumo-pedido-compra/insumo-pedido-pipeline-badge-label';

export type InsumoPedidoPipelineBadgeProps = {
  nome: string;
  quantidadeLabel: string;
  resumo: InsumoPedidoPipelineResumo;
  onClick?: () => void;
  className?: string;
};

export function InsumoPedidoPipelineBadge({
  nome,
  quantidadeLabel,
  resumo,
  onClick,
  className = '',
}: InsumoPedidoPipelineBadgeProps) {
  const label = formatPipelineBadge({
    atrasado: resumo.atrasado,
    quantidadeLabel,
    proximaData: resumo.proximaData,
  });

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${nome}: ${label.ariaSuffix}`}
      className={[
        'inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Badge
        tone={label.tone}
        icon={resumo.atrasado ? 'schedule' : 'local_shipping'}
        className="gap-1.5"
      >
        <span>{label.texto}</span>
        <span className="font-mono tabular-nums">{label.detalhe}</span>
      </Badge>
    </button>
  );
}
