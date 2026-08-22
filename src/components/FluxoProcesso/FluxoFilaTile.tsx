'use client';

import type { CSSProperties } from 'react';
import { Badge } from '@/components/ui/Badge';
import type {
  FluxoFilaItem,
  FluxoFilaKey,
  FluxoFilaUltimoLote,
} from '@/domain/fluxo-processo/filas/fluxo-filas-types';
import type { FluxoDisplayScale } from './fluxo-display-scale';
import { useFluxoDisplay } from './fluxo-display-context';
import {
  formatAcimaDoPrazoBadge,
  formatFilaResumoQty,
  FluxoFilaEmbaladoCopy,
  FluxoFilaUltimoLoteCopy,
} from './fluxo-fila-format';

const AMBER_ACTIVE = '#D97706';

export type FluxoFilaTileProps = {
  filaKey: FluxoFilaKey;
  label: string;
  icon: string;
  accentColor: string;
  items: FluxoFilaItem[];
  presoUn: number;
  showPrazo: boolean;
  prazoMin?: number;
  ultimoLote: FluxoFilaUltimoLote | null;
  active: boolean;
  onClick: () => void;
  detailId: string;
};

function tileActiveStyle(active: boolean): CSSProperties | undefined {
  if (!active) return undefined;
  return {
    border: `1px solid ${AMBER_ACTIVE}`,
    boxShadow: `0 0 0 3px color-mix(in srgb, ${AMBER_ACTIVE} 12%, transparent)`,
  };
}

function tileClassName(active: boolean): string {
  return [
    'flex min-h-11 min-w-0 w-full flex-col overflow-hidden rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-left',
    'transition-[border-color,box-shadow,background] duration-150 ease-out',
    'motion-reduce:transition-none',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2',
    active ? 'bg-white' : 'hover:border-stone-300',
  ].join(' ');
}

class FluxoFilaAcaoCopy {
  static label(filaKey: FluxoFilaKey): string {
    if (filaKey === 'aProduzir') return 'Ver OPs';
    if (filaKey === 'perdas') return 'Ver perdas';
    return 'Ver lotes';
  }
}

class FluxoFilaTileAlerts {
  static prazo(
    showPrazo: boolean,
    presoUn: number,
    items: FluxoFilaItem[],
    prazoMin: number,
    scale: FluxoDisplayScale,
  ): string | null {
    if (!showPrazo || presoUn <= 0) return null;
    const qty = formatFilaResumoQty(items, scale, { presoOnly: true, compact: true });
    return formatAcimaDoPrazoBadge(qty, prazoMin);
  }

  static anterior(
    filaKey: FluxoFilaKey,
    items: FluxoFilaItem[],
    scale: FluxoDisplayScale,
  ): string | null {
    if (filaKey !== 'embalado') return null;
    if (!items.some((i) => i.origem !== 'op_do_dia')) return null;
    const qty = formatFilaResumoQty(items, scale, { origem: 'nao_do_dia', compact: true });
    return FluxoFilaEmbaladoCopy.badgeApoio(qty, FluxoFilaEmbaladoCopy.datasOpAnteriores(items));
  }
}

function FluxoFilaTileAlertBadge({
  label,
  tone,
}: {
  label: string;
  tone: 'danger' | 'warning';
}) {
  return (
    <Badge
      tone={tone}
      pill={false}
      numeric
      aria-hidden
      className="max-w-[7.5rem] shrink truncate px-1.5 py-0.5 text-[11px] leading-none"
    >
      {label}
    </Badge>
  );
}

function FluxoFilaTileUltimoLote({ lote }: { lote: FluxoFilaUltimoLote | null }) {
  const { scale } = useFluxoDisplay();
  if (!lote) return null;
  const { qty, produto, hora } = FluxoFilaUltimoLoteCopy.partes(lote, scale);
  return (
    <p
      className="mt-1 flex min-w-0 items-baseline gap-1 text-[11px] text-text-muted"
      title={FluxoFilaUltimoLoteCopy.linha(lote, scale)}
    >
      <span className="shrink-0 font-mono tabular-nums text-text-strong">{qty}</span>
      <span className="min-w-0 truncate">{produto}</span>
      <span className="shrink-0 font-mono tabular-nums">{hora}</span>
    </p>
  );
}

function FluxoFilaTileAction({
  active,
  filaKey,
}: {
  active: boolean;
  filaKey: FluxoFilaKey;
}) {
  return (
    <span className="mt-2 inline-flex items-center gap-0.5 text-[13px] font-medium text-text-muted">
      {FluxoFilaAcaoCopy.label(filaKey)}
      <span
        className={[
          'material-icons text-lg transition-transform duration-150 motion-reduce:transition-none',
          active ? 'rotate-180' : '',
        ].join(' ')}
        aria-hidden
      >
        expand_more
      </span>
    </span>
  );
}

export default function FluxoFilaTile({
  filaKey,
  label,
  icon,
  accentColor,
  items,
  presoUn,
  showPrazo,
  prazoMin = 0,
  ultimoLote,
  active,
  onClick,
  detailId,
}: FluxoFilaTileProps) {
  const { scale } = useFluxoDisplay();
  const volume =
    filaKey === 'embalado'
      ? formatFilaResumoQty(items, scale, { origem: 'op_do_dia' })
      : formatFilaResumoQty(items, scale);
  const alertaPrazo = FluxoFilaTileAlerts.prazo(showPrazo, presoUn, items, prazoMin, scale);
  const alertaAnterior = FluxoFilaTileAlerts.anterior(filaKey, items, scale);
  const alerta = alertaPrazo ?? alertaAnterior;
  const alertaTone = alertaPrazo ? 'danger' : 'warning';
  const ultimoLinha = ultimoLote ? FluxoFilaUltimoLoteCopy.linha(ultimoLote, scale) : null;

  return (
    <button
      type="button"
      aria-expanded={active}
      aria-controls={detailId}
      aria-label={FluxoFilaEmbaladoCopy.ariaTile(label, volume, alerta, ultimoLinha)}
      onClick={onClick}
      style={tileActiveStyle(active)}
      data-fila-key={filaKey}
      className={tileClassName(active)}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="material-icons shrink-0 text-xl" style={{ color: accentColor }} aria-hidden>
          {icon}
        </span>
        <span className="min-w-0 truncate text-[15px] font-bold tracking-tight text-text-strong">
          {label}
        </span>
      </div>
      <div className="mt-2 flex min-w-0 flex-wrap items-start justify-between gap-2">
        <p className="min-w-0 font-mono text-xl font-bold leading-none tabular-nums text-text-strong">
          {volume}
        </p>
        {alerta ? <FluxoFilaTileAlertBadge label={alerta} tone={alertaTone} /> : null}
      </div>
      <FluxoFilaTileUltimoLote lote={ultimoLote} />
      <FluxoFilaTileAction active={active} filaKey={filaKey} />
    </button>
  );
}
