'use client';

import type { FluxoEtapaResumo, VpFluxoPayload } from '@/domain/fluxo-processo/fluxo-processo-types';
import { useFluxoDisplay } from './fluxo-display-context';
import { fmtQtyExact } from './fluxo-display-scale';
import { diaAnteriorLabelFromDia } from './fluxo-processo-format';

type FluxoEtapaCardSemControleProps = {
  fluxo: VpFluxoPayload;
  etapa: FluxoEtapaResumo;
};

export default function FluxoEtapaCardSemControle({
  fluxo,
  etapa: e,
}: FluxoEtapaCardSemControleProps) {
  const { scale } = useFluxoDisplay();
  const antLabel = diaAnteriorLabelFromDia(fluxo.dia);
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
      {e.key === 'emb' && scale.opAnteriorTotal() > 0 ? (
        <div className="mt-0.5 text-[11px] text-text-faint">
          {fmtQtyExact(scale.opAnteriorTotal())} de OP de {antLabel}
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
