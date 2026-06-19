'use client';

import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/Badge';
import type { PainelPedidoEmbalagem } from '@/domain/types/painel-embalagem';
import { getPedidoEmbalagemFilterStatus } from './embalagem-status';

type EmbalagemClientGroupProps = {
  cliente?: string;
  dataFabricacao?: string;
  observacao?: string;
  selectedDate: string;
  pedidos: PainelPedidoEmbalagem[];
  children: ReactNode;
};

function formatDateShort(dateString: string): string {
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const [, month, day] = parts;
    return `${day}/${month}`;
  }
  return dateString;
}

export default function EmbalagemClientGroup({
  cliente,
  dataFabricacao,
  observacao,
  selectedDate,
  pedidos,
  children,
}: EmbalagemClientGroupProps) {
  const dataDiferente = dataFabricacao && dataFabricacao !== selectedDate;
  const concluidos = pedidos.filter((p) => getPedidoEmbalagemFilterStatus(p) === 'concluido').length;

  return (
    <section className="mb-5">
      <div className="mb-2.5 flex flex-wrap items-center gap-2.5 px-0.5">
        {cliente ? (
          <h3 className="text-base font-semibold tracking-[-0.004em] text-text-strong">
            {cliente}
          </h3>
        ) : null}
        {dataDiferente ? (
          <Badge tone="warning" numeric>
            Etiqueta {formatDateShort(dataFabricacao)}
          </Badge>
        ) : null}
        {observacao ? (
          <span className="text-xs italic text-text-muted">Obs: {observacao}</span>
        ) : null}
        <span className="ml-auto font-mono text-xs tabular-nums text-text-muted">
          {concluidos}/{pedidos.length} concluídos
        </span>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}
