'use client';

import { formatEstimativaClockHHmm } from '@/domain/estimativa-producao/estimativa-producao-format';
import type { FluxoOpRelogioItem } from '@/domain/fluxo-processo/controle/fluxo-controle-types';

type FluxoOpRelogioRowProps = {
  item: FluxoOpRelogioItem;
};

function formatDeltaMin(deltaMin: number | null): string {
  if (deltaMin === null) return '—';
  const sign = deltaMin > 0 ? '+' : '';
  return `${sign}${deltaMin} min`;
}

export default function FluxoOpRelogioRow({ item }: FluxoOpRelogioRowProps) {
  const prev = formatEstimativaClockHHmm(item.previstoFimIso) ?? '—';
  const ultimo = formatEstimativaClockHHmm(item.realizadoFimIso) ?? '—';
  const delta = formatDeltaMin(item.deltaMin);

  return (
    <li
      title={item.produtoNome}
      className="flex min-h-11 items-baseline gap-1.5 border-b border-stone-100 py-2 text-[12px] last:border-b-0"
    >
      <span className="shrink-0 font-mono tabular-nums text-text-muted">
        #{item.ordemPlanejamento}
      </span>
      <span className="text-text-faint" aria-hidden>
        ·
      </span>
      <span className="min-w-0 flex-1 truncate text-text-body">{item.produtoNome}</span>
      <span className="text-text-faint" aria-hidden>
        ·
      </span>
      <span className="shrink-0 font-mono tabular-nums text-text-muted">
        prev {prev}
      </span>
      <span className="text-text-faint" aria-hidden>
        ·
      </span>
      <span className="shrink-0 font-mono tabular-nums text-text-muted">
        último {ultimo}
      </span>
      <span className="text-text-faint" aria-hidden>
        ·
      </span>
      <span className="shrink-0 font-mono tabular-nums text-text-strong">
        Δ {delta}
      </span>
    </li>
  );
}
