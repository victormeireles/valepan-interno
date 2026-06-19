'use client';

import type { EtiquetaFilaItem } from '@/domain/etiquetas/etiqueta-fila-types';
import { formatLocalTimeHHmm } from '@/lib/utils/date-utils';
import {
  formatEtiquetaMeta,
  formatEtiquetaRealizado,
} from '@/components/Etiquetas/format-etiqueta-quantidade';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

type EtiquetaPedidoCardProps = {
  item: EtiquetaFilaItem;
  variant: 'pendente' | 'gerado';
  onAction: (item: EtiquetaFilaItem) => void;
};

export default function EtiquetaPedidoCard({
  item,
  variant,
  onAction,
}: EtiquetaPedidoCardProps) {
  const geradoLabel =
    variant === 'gerado' && item.geradoEm
      ? formatLocalTimeHHmm(item.geradoEm)
      : null;

  return (
    <Card
      as="article"
      padding="md"
      interactive={variant === 'pendente'}
      className="flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-text-strong">{item.produto}</h3>
          <p className="truncate text-sm text-text-muted">{item.tipoEstoque}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {item.origem === 'pedido' ? (
            <div
              className="flex items-center gap-1.5 font-mono text-sm tabular-nums"
              aria-label={`Realizado ${formatEtiquetaRealizado(item.produzido)}, meta ${formatEtiquetaMeta(item.pedido)}`}
            >
              <span className="font-semibold text-text-strong">
                {formatEtiquetaRealizado(item.produzido)}
              </span>
              <span className="text-xs text-stone-400">/</span>
              <span className="text-text-muted">{formatEtiquetaMeta(item.pedido)}</span>
            </div>
          ) : (
            <Badge tone="accent">Manual</Badge>
          )}
          {item.lote != null ? (
            <Badge tone="neutral" numeric>
              Lote {item.lote}
            </Badge>
          ) : null}
        </div>
      </div>

      {item.origem === 'pedido' && item.primeiroLoteHorario ? (
        <p className="text-xs text-text-muted">
          Embalado às {item.primeiroLoteHorario}
        </p>
      ) : null}

      {geradoLabel ? (
        <Badge tone="success" icon="check_circle">
          Gerado às {geradoLabel}
        </Badge>
      ) : null}

      <Button
        type="button"
        variant={variant === 'pendente' ? 'primary' : 'secondary'}
        icon={variant === 'pendente' ? 'print' : 'replay'}
        fullWidth
        onClick={() => onAction(item)}
      >
        {variant === 'pendente' ? 'Gerar etiqueta' : 'Reimprimir'}
      </Button>
    </Card>
  );
}
