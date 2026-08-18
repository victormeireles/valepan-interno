'use client';

import type { CSSProperties } from 'react';
import type { FluxoFilaItem, FluxoFilaKey } from '@/domain/fluxo-processo/filas/fluxo-filas-types';
import { useFluxoDisplay } from './fluxo-display-context';
import { formatAcimaDoPrazoLinha, formatFilaResumoQty, formatNenhumAcimaDoPrazo, FluxoFilaEmbaladoCopy } from './fluxo-fila-format';

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
  active: boolean;
  onClick: () => void;
  detailId: string;
};

class FluxoFilaPrazoCopy {
  static linha(presoUn: number, qtyLabel: string, prazoMin: number): string {
    if (presoUn > 0) return formatAcimaDoPrazoLinha(qtyLabel, prazoMin);
    return formatNenhumAcimaDoPrazo(prazoMin);
  }
}

function tileActiveStyle(active: boolean): CSSProperties | undefined {
  if (!active) return undefined;
  return {
    border: `1px solid ${AMBER_ACTIVE}`,
    boxShadow: `0 0 0 3px color-mix(in srgb, ${AMBER_ACTIVE} 12%, transparent)`,
  };
}

function FluxoFilaTilePrazoLine({
  showPrazo,
  items,
  presoUn,
  prazoMin,
}: {
  showPrazo: boolean;
  items: FluxoFilaItem[];
  presoUn: number;
  prazoMin: number;
}) {
  const { scale } = useFluxoDisplay();
  if (!showPrazo) return null;
  const qtyLabel = formatFilaResumoQty(items, scale, { presoOnly: true });
  const preso = presoUn > 0;
  return (
    <p
      className={[
        'mt-1 text-[12px] font-medium',
        preso ? 'text-amber-800' : 'text-text-muted',
      ].join(' ')}
    >
      {FluxoFilaPrazoCopy.linha(presoUn, qtyLabel, prazoMin)}
    </p>
  );
}

function tileClassName(active: boolean): string {
  return [
    'flex min-h-11 w-full flex-col rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-left',
    'transition-[border-color,box-shadow,background] duration-150 ease-out',
    'motion-reduce:transition-none',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2',
    active ? 'bg-white' : 'hover:border-stone-300',
  ].join(' ');
}

class FluxoFilaAcaoCopy {
  static label(filaKey: FluxoFilaKey): string {
    return filaKey === 'aProduzir' ? 'Ver OPs' : 'Ver lotes';
  }
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
  active,
  onClick,
  detailId,
}: FluxoFilaTileProps) {
  const { scale } = useFluxoDisplay();
  const volume =
    filaKey === 'embalado'
      ? formatFilaResumoQty(items, scale, { origem: 'op_do_dia' })
      : formatFilaResumoQty(items, scale);
  const qtyAnt = formatFilaResumoQty(items, scale, { origem: 'nao_do_dia' });
  const datas = FluxoFilaEmbaladoCopy.datasOpAnteriores(items);
  const temAnterior = filaKey === 'embalado' && items.some((i) => i.origem !== 'op_do_dia');
  const linhaApoio = temAnterior ? FluxoFilaEmbaladoCopy.linhaApoio(qtyAnt, datas) : null;

  return (
    <button
      type="button"
      aria-expanded={active}
      aria-controls={detailId}
      aria-label={FluxoFilaEmbaladoCopy.ariaTile(label, volume, linhaApoio)}
      onClick={onClick}
      style={tileActiveStyle(active)}
      data-fila-key={filaKey}
      className={tileClassName(active)}
    >
      <div className="flex items-center gap-2">
        <span className="material-icons text-xl" style={{ color: accentColor }} aria-hidden>
          {icon}
        </span>
        <span className="text-[15px] font-bold tracking-tight text-text-strong">{label}</span>
      </div>
      <p className="mt-2 font-mono text-xl font-bold leading-none tabular-nums text-text-strong">
        {volume}
      </p>
      {linhaApoio ? (
        <p className="mt-1 text-[11px] text-text-faint">{linhaApoio}</p>
      ) : null}
      <FluxoFilaTilePrazoLine
        showPrazo={showPrazo}
        items={items}
        presoUn={presoUn}
        prazoMin={prazoMin}
      />
      <FluxoFilaTileAction active={active} filaKey={filaKey} />
    </button>
  );
}
