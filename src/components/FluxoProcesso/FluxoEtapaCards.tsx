'use client';

import { Card } from '@/components/ui/Card';
import type { FluxoEtapaResumo, VpFluxoPayload } from '@/domain/fluxo-processo/fluxo-processo-types';
import { useFluxoDisplay } from './fluxo-display-context';
import { fmtQty, fmtQtyK } from './fluxo-display-scale';
import FluxoEtapaContinuidade from './FluxoEtapaContinuidade';
import {
  diaAnteriorLabelFromDia,
  FLUXO_UI_ETAPA_COR,
  hhmm,
} from './fluxo-processo-format';

type FluxoEtapaCardsProps = {
  fluxo: VpFluxoPayload;
  etapaAtiva: string;
  onSelect: (key: FluxoEtapaResumo['key']) => void;
};

export default function FluxoEtapaCards({ fluxo, etapaAtiva, onSelect }: FluxoEtapaCardsProps) {
  const { scale } = useFluxoDisplay();
  const antLabel = diaAnteriorLabelFromDia(fluxo.dia);

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {fluxo.etapas.map((e) => {
        const ativa = etapaAtiva === e.key;
        const cor = FLUXO_UI_ETAPA_COR[e.key];
        const volume = scale.etapaTotal(e.key);
        const cap = scale.capacidade(e.key);
        const ritmo = e.ativo ? (volume / e.ativo) * 60 : 0;
        const vsCap = cap > 0 ? ritmo / cap : 0;
        const fermVol = scale.etapaTotal('ferm');
        const plano = scale.planoTotal();

        return (
          <Card
            key={e.key}
            padding="lg"
            className="cursor-pointer"
            style={
              ativa
                ? {
                    border: `1px solid ${cor}`,
                    boxShadow: `0 0 0 3px color-mix(in srgb, ${cor} 12%, transparent)`,
                  }
                : undefined
            }
            onClick={() => onSelect(e.key)}
          >
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                style={{ background: cor }}
                aria-hidden
              />
              <span className="text-[15px] font-bold tracking-tight text-text-strong">
                {e.nome}
              </span>
              <span className="ml-auto font-mono text-[11px] tabular-nums text-text-muted">
                {hhmm(e.ini)} → {hhmm(e.fim)}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
                  Volume
                </div>
                <div className="mt-0.5 font-mono text-xl font-bold tabular-nums text-text-strong">
                  {fmtQty(volume, scale.mode)}
                  <span className="text-[11px] font-medium text-text-muted">
                    {' '}
                    {scale.unitLabel}
                  </span>
                </div>
                {e.key === 'emb' ? (
                  <div className="mt-0.5 text-[11px] text-text-faint">
                    {fmtQty(scale.opAnteriorTotal(), scale.mode)} de OP de {antLabel}
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
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
                  Ritmo no lançamento
                </div>
                <div
                  className={[
                    'mt-0.5 font-mono text-xl font-bold tabular-nums',
                    vsCap > 1.1 ? 'text-warning-fg' : 'text-text-strong',
                  ].join(' ')}
                >
                  {fmtQty(ritmo, scale.mode)}
                  <span className="text-[11px] font-medium text-text-muted">
                    {' '}
                    {scale.rateLabel}
                  </span>
                </div>
                <div className="mt-0.5 text-[11px] text-text-faint">
                  informado {fmtQtyK(cap, scale.mode)}/h
                </div>
              </div>
            </div>

            <FluxoEtapaContinuidade fluxo={fluxo} etapa={e} cor={cor} />
          </Card>
        );
      })}
    </div>
  );
}
