'use client';

import type { FluxoEtapaResumo, VpFluxoPayload } from '@/domain/fluxo-processo/fluxo-processo-types';
import { useFluxoDisplay } from './fluxo-display-context';
import { fmtQtyExact } from './fluxo-display-scale';
import { FluxoJanelaGraficoCopy } from './fluxo-janela-grafico-copy';

type FluxoEtapaCardSemControleProps = {
  fluxo: VpFluxoPayload;
  etapa: FluxoEtapaResumo;
};

export default function FluxoEtapaCardSemControle({
  fluxo,
  etapa: e,
}: FluxoEtapaCardSemControleProps) {
  const { scale } = useFluxoDisplay();
  const outraOp = scale.opAnteriorTotal(e.key);
  const opLabel = FluxoJanelaGraficoCopy.cardOpLabel(
    fluxo.turnosResumo?.[e.key]?.outraOpData,
    fluxo.dia,
  );
  const volume = scale.etapaTotal(e.key);
  const fermVol = scale.etapaTotal('ferm');
  const plano = scale.planoTotal();

  return (
    <div className="mt-3">
      <div className="font-mono text-xl font-bold tabular-nums text-text-strong">
        {fmtQtyExact(volume)}
        <span className="text-[11px] font-medium text-text-muted">
          {' '}
          {scale.unitLabel}
        </span>
      </div>
      {outraOp > 0 ? (
        <div className="mt-0.5 text-[11px] text-text-faint">
          {fmtQtyExact(outraOp)} de {opLabel}
        </div>
      ) : null}
      {e.key === 'ferm' ? (
        <div className="mt-0.5 text-[11px] text-text-faint">
          {plano > 0 ? Math.round((volume / plano) * 100) : 0}% do plano
        </div>
      ) : null}
      {e.key === 'forno' ? (
        <div className="mt-0.5 text-[11px] text-text-faint">
          {fermVol > 0 ? Math.round((volume / fermVol) * 100) : 0}% do fermentado
        </div>
      ) : null}
    </div>
  );
}
