'use client';

import type { FluxoControleEtapaNumeros } from '@/domain/fluxo-processo/controle/fluxo-controle-types';
import type { FluxoEtapaResumo, VpFluxoPayload } from '@/domain/fluxo-processo/fluxo-processo-types';
import { useFluxoDisplay } from './fluxo-display-context';
import { FluxoControleDisplayQtysBuilder } from './fluxo-controle-display-qtys';
import { fmtQtyExact } from './fluxo-display-scale';
import FluxoEtapaMeter from './FluxoEtapaMeter';
import { FluxoEtapaStatusChipResolver } from './fluxo-etapa-status-chip';
import { diaAnteriorLabelFromDia } from './fluxo-processo-format';

const statusChip = new FluxoEtapaStatusChipResolver();
const displayQtys = new FluxoControleDisplayQtysBuilder();

type FluxoEtapaCardComControleProps = {
  fluxo: VpFluxoPayload;
  etapa: FluxoEtapaResumo;
  numeros: FluxoControleEtapaNumeros;
  cor: string;
};

function fmtSignedQty(n: number): string {
  if (n > 0) return `+${fmtQtyExact(n)}`;
  return fmtQtyExact(n);
}

const AGORA_COR: Record<FluxoControleEtapaNumeros['status'], string> = {
  atrasado: '#B45309',
  adiantado: '#047857',
  'no plano': '#78716C',
};

const AGORA_VALUE: Record<FluxoControleEtapaNumeros['status'], string> = {
  atrasado: 'text-warning-fg',
  adiantado: 'text-success-fg',
  'no plano': 'text-text-muted',
};

export default function FluxoEtapaCardComControle({
  fluxo,
  etapa: e,
  numeros,
  cor,
}: FluxoEtapaCardComControleProps) {
  const { scale } = useFluxoDisplay();
  const antLabel = diaAnteriorLabelFromDia(fluxo.dia);
  const qtys = displayQtys.build(scale, fluxo, e.key, numeros);
  const chip = statusChip.resolve(qtys.status);

  return (
    <div className="mt-3">
      <div className="font-mono text-xl font-bold leading-none tabular-nums text-text-strong">
        {fmtQtyExact(qtys.estaDisplay)}
        <span className="text-[13px] font-semibold text-text-muted">
          {' / '}
          {fmtQtyExact(qtys.objetivoDisplay)}
        </span>
        <span className="text-[11px] font-medium text-text-muted">
          {' '}
          {scale.unitLabel}
        </span>
      </div>
      {e.key === 'emb' && scale.opAnteriorTotal() > 0 ? (
        <div className="mt-1 text-[11px] text-text-faint">
          {fmtQtyExact(scale.opAnteriorTotal())} de OP de {antLabel}
        </div>
      ) : null}

      <div className="mt-3 space-y-1">
        <FluxoEtapaMeter
          label="OP"
          fillPct={qtys.barraOpPct}
          cor={cor}
          value={fmtQtyExact(qtys.objetivoDisplay)}
          ariaLabel={`${qtys.barraOpPct ?? 0}% da OP: ${fmtQtyExact(qtys.estaDisplay)} de ${fmtQtyExact(qtys.objetivoDisplay)} ${scale.unitLabel}`}
        />
        <FluxoEtapaMeter
          label="Agora"
          fillPct={qtys.barraPct}
          cor={AGORA_COR[qtys.status]}
          value={fmtQtyExact(qtys.deveriaDisplay)}
          ariaLabel={`${qtys.barraPct ?? 0}% do previsto agora: ${fmtQtyExact(qtys.estaDisplay)} de ${fmtQtyExact(qtys.deveriaDisplay)} ${scale.unitLabel}`}
        />
      </div>
      <div
        className={[
          'mt-1.5 flex min-h-7 items-center gap-1 text-[12px] font-medium',
          AGORA_VALUE[qtys.status],
        ].join(' ')}
      >
        <span className="material-icons text-[14px]" aria-hidden>
          {chip.icon}
        </span>
        <span className="font-mono tabular-nums">
          {fmtSignedQty(qtys.deltaDisplay)}
        </span>
        <span>{chip.label}</span>
      </div>
    </div>
  );
}
