'use client';

import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/Badge';
import type { EtapaProductItem } from './types';

type EtapaClientGroupProps = {
  cliente?: string;
  dataFabricacao?: string;
  observacao?: string;
  selectedDate: string;
  products: EtapaProductItem[];
  hideHeader?: boolean;
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

export default function EtapaClientGroup({
  cliente,
  dataFabricacao,
  observacao,
  selectedDate,
  products,
  hideHeader = false,
  children,
}: EtapaClientGroupProps) {
  const dataDiferente = dataFabricacao && dataFabricacao !== selectedDate;
  const concluidos = products.filter((p) => p.filterStatus === 'concluido').length;
  const showHeader =
    !hideHeader && (cliente || dataDiferente || observacao || products.length > 0);

  return (
    <section className={hideHeader ? 'mb-0' : 'mb-5'}>
      {showHeader ? (
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
            {concluidos}/{products.length} concluídos
          </span>
        </div>
      ) : null}
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}
