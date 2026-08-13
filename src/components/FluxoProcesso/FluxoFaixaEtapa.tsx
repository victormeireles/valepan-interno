'use client';

import type { FluxoEtapaResumo } from '@/domain/fluxo-processo/fluxo-processo-types';
import { durOf, FLUXO_UI_ETAPA_COR, hhmm } from './fluxo-processo-format';

type FluxoFaixaEtapaProps = {
  etapa: FluxoEtapaResumo;
};

export default function FluxoFaixaEtapa({ etapa: e }: FluxoFaixaEtapaProps) {
  const segs: [number, number][] = [];
  let cur = e.ini;
  for (const g of e.gaps) {
    segs.push([cur, g.ini]);
    cur = g.fim;
  }
  segs.push([cur, e.fim]);
  const px = (m: number) => (m / 1440) * 100;
  const cor = FLUXO_UI_ETAPA_COR[e.key];

  return (
    <div className="mt-3 flex items-center border-t border-stone-100 pt-2.5">
      <span className="w-[46px] shrink-0 pr-2 text-right text-[10px] text-text-muted">
        lançou
      </span>
      <div className="relative h-3 flex-1 rounded-[3px] bg-surface-sunken">
        {segs.map((s, i) => (
          <div
            key={`s${i}`}
            title={`com lançamento ${hhmm(s[0])}–${hhmm(s[1])} · ${durOf(s[1] - s[0])}`}
            className="absolute top-0 h-3 rounded-[2px]"
            style={{
              left: `${px(s[0])}%`,
              width: `${px(s[1]) - px(s[0])}%`,
              background: cor,
            }}
          />
        ))}
        {e.gaps.map((g, i) => (
          <div
            key={`g${i}`}
            title={`sem apontar ${hhmm(g.ini)}–${hhmm(g.fim)} · ${durOf(g.dur)}`}
            className="absolute top-0 h-3 rounded-[2px]"
            style={{
              left: `${px(g.ini)}%`,
              width: `${px(g.fim) - px(g.ini)}%`,
              background:
                'repeating-linear-gradient(45deg, var(--stone-300) 0 3px, transparent 3px 7px)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
