'use client';

import {
  FluxoOpResultadoPresenter,
  type FluxoOpResultado,
  type FluxoOpResultadoView,
} from '@/domain/fluxo-processo/op-resultado/fluxo-op-resultado';
import { fmtQtyExact } from './fluxo-display-scale';
import FluxoEtapaMeter from './FluxoEtapaMeter';

const presenter = new FluxoOpResultadoPresenter();
const COR_META = 'var(--success)';

type FluxoEtapaOpResultadoProps = {
  resultado: FluxoOpResultado;
  cor: string;
};

export default function FluxoEtapaOpResultado({
  resultado,
  cor,
}: FluxoEtapaOpResultadoProps) {
  const view = presenter.present(resultado);

  return (
    <div className="mt-3">
      <OpHeadline view={view} />
      {view.barraPct != null ? (
        <div className="mt-3">
          <FluxoEtapaMeter
            label="OP"
            fillPct={view.barraPct}
            cor={view.metaAtingida ? COR_META : cor}
            value={fmtQtyExact(view.meta)}
            ariaLabel={ariaResultado(view)}
          />
        </div>
      ) : null}
      <OpStatus view={view} />
      {view.diaLinha ? <OpDiaLinha linha={view.diaLinha} /> : null}
    </div>
  );
}

function OpHeadline({ view }: { view: FluxoOpResultadoView }) {
  return (
    <div className="font-mono text-xl font-bold leading-none tabular-nums text-text-strong">
      {fmtQtyExact(view.feito)}
      <span className="text-[13px] font-semibold text-text-muted">
        {' / '}
        {fmtQtyExact(view.meta)}
      </span>
      <span className="text-xs font-medium text-text-muted"> {view.unitLabel}</span>
    </div>
  );
}

function OpStatus({ view }: { view: FluxoOpResultadoView }) {
  if (view.meta === 0 && view.feito === 0) return null;

  if (view.metaAtingida) {
    return (
      <p className="mt-1.5 flex min-h-7 items-center gap-1 text-xs font-medium text-success-fg">
        <span className="material-icons text-[14px]" aria-hidden>
          check_circle
        </span>
        <span>meta atingida</span>
        {view.delta > 0 ? (
          <span className="font-mono tabular-nums">+{fmtQtyExact(view.delta)}</span>
        ) : null}
      </p>
    );
  }

  return (
    <p className="mt-1.5 flex min-h-7 items-center gap-1 text-xs font-medium text-warning-fg">
      <span className="material-icons text-[14px]" aria-hidden>
        pending
      </span>
      <span>faltam</span>
      <span className="font-mono tabular-nums">{fmtQtyExact(view.falta)}</span>
    </p>
  );
}

function OpDiaLinha({ linha }: { linha: string }) {
  return <p className="mt-1 text-xs text-text-muted">{linha}</p>;
}

function ariaResultado(view: FluxoOpResultadoView): string {
  const status = view.metaAtingida
    ? view.delta > 0
      ? `meta atingida, ${fmtQtyExact(view.delta)} acima`
      : 'meta atingida'
    : `faltam ${fmtQtyExact(view.falta)}`;
  const dia = view.diaLinha ? `. ${view.diaLinha}` : '';
  return `${fmtQtyExact(view.feito)} de ${fmtQtyExact(view.meta)} ${view.unitLabel}, ${status}${dia}`;
}
