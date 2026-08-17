'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { FluxoHorasComLancamentoCounter } from '@/domain/fluxo-processo/fluxo-horas-com-lancamento';
import {
  FLUXO_BLOCO_MAX_CX,
  FLUXO_BLOCO_MAX_LT_FERM,
  FLUXO_BLOCO_MAX_LT_FORNO,
} from '@/domain/fluxo-processo/fluxo-processo-constants';
import type { FluxoEtapaResumo, VpFluxoPayload } from '@/domain/fluxo-processo/fluxo-processo-types';
import { useFluxoDisplay } from './fluxo-display-context';
import { fmtQty } from './fluxo-display-scale';
import FluxoTermoHint from './FluxoTermoHint';
import { hhmm } from './fluxo-processo-format';

const horasCounter = new FluxoHorasComLancamentoCounter();

type FluxoEtapaContinuidadeProps = {
  fluxo: VpFluxoPayload;
  etapa: FluxoEtapaResumo;
  cor: string;
};

/**
 * Rodapé do card — só o essencial:
 * 1) horas cheias com lançamento / base (24 ou hora atual se hoje)
 * 2) % digitado em bloco (expansível)
 */
export default function FluxoEtapaContinuidade({
  fluxo,
  etapa: e,
  cor,
}: FluxoEtapaContinuidadeProps) {
  const { scale } = useFluxoDisplay();
  const [blocoOpen, setBlocoOpen] = useState(false);
  const { horasCom, baseHoras } = horasCounter.count(fluxo, e.key);
  const pct = Math.round((horasCom / baseHoras) * 100);
  const temBloco = e.blocoLancamentos.length > 0;
  const horasParadas = baseHoras - horasCom;
  const limiteBloco =
    e.key === 'emb'
      ? `mais de ${FLUXO_BLOCO_MAX_CX} CX`
      : e.key === 'forno'
        ? `mais de ${FLUXO_BLOCO_MAX_LT_FORNO} LT`
        : `mais de ${FLUXO_BLOCO_MAX_LT_FERM} LT`;

  return (
    <div className="mt-3 border-t border-stone-100 pt-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
            Horas com lançamento
          </div>
          <div className="mt-0.5 font-mono text-sm font-bold tabular-nums text-text-strong">
            {horasCom}
            <span className="font-medium text-text-muted"> / {baseHoras} h</span>
          </div>
        </div>
        <div className="shrink-0 text-right font-mono text-[11px] tabular-nums text-text-muted">
          {horasParadas > 0 ? `${horasParadas} h sem lançar` : 'janela cheia'}
        </div>
      </div>

      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-surface-sunken"
        role="progressbar"
        aria-valuenow={horasCom}
        aria-valuemin={0}
        aria-valuemax={baseHoras}
        aria-label={`${horasCom} de ${baseHoras} horas com lançamento`}
        title={`${horasCom} h com lançamento · ${horasParadas} h sem lançamento (${pct}% da janela)`}
      >
        <div
          className="h-full rounded-full transition-[width] duration-150 ease-out"
          style={{ width: `${pct}%`, background: cor }}
        />
      </div>

      {temBloco ? (
        <div className="mt-2.5">
          <button
            type="button"
            aria-expanded={blocoOpen}
            onClick={(event) => {
              event.stopPropagation();
              setBlocoOpen((v) => !v);
            }}
            className="inline-flex min-h-9 cursor-pointer items-center border-none bg-transparent p-0"
          >
            <Badge tone="warning" icon="warning" className="pointer-events-none">
              {e.blocoPct}% digitado em bloco
              <span className="material-icons text-[14px]" aria-hidden>
                {blocoOpen ? 'expand_less' : 'expand_more'}
              </span>
            </Badge>
          </button>

          {blocoOpen ? (
            <div
              className="mt-2 rounded-xl border border-warning-border bg-warning-bg/40 p-2.5"
              onClick={(event) => event.stopPropagation()}
            >
              <FluxoTermoHint label="O que é digitação em bloco?" title="Digitação em bloco">
                Um único lançamento com {limiteBloco}. Vários apontamentos no limite (mesmo
                próximos no horário) não contam como bloco.
              </FluxoTermoHint>

              <ul className="mt-2 space-y-1.5">
                {e.blocoLancamentos.map((b) => {
                  const qty =
                    b.produtos.length > 0
                      ? b.produtos.reduce(
                          (t, p) => t + scale.fromUn(p.un, p.assadeiraNome, p.nome),
                          0,
                        )
                      : scale.fromUn(b.un, b.assadeiraNome);
                  return (
                    <li
                      key={`${b.ini}-${b.fim}-${b.un}-${b.produtos[0]?.nome ?? ''}`}
                      className="rounded-lg border border-border-default bg-surface px-2.5 py-1.5 text-[11px] text-text-body"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-mono font-semibold tabular-nums text-text-strong">
                          {hhmm(b.ini)}
                        </span>
                        <span className="font-mono tabular-nums text-text-muted">
                          {b.eventos} apont. · {fmtQty(qty, scale.mode)} {scale.unitLabel}
                        </span>
                      </div>
                      {b.produtos.length > 0 ? (
                        <div className="mt-0.5 text-text-muted">
                          {b.produtos
                            .filter(
                              (p) =>
                                scale.mode !== 'cx' || scale.temConversaoCaixa(p.nome),
                            )
                            .map(
                              (p) =>
                                `${p.nome} (${fmtQty(scale.fromUn(p.un, p.assadeiraNome, p.nome), scale.mode)} ${scale.unitLabel})`,
                            )
                            .join(' · ')}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
