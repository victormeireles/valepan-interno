'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import type { VpFluxoPayload } from '@/domain/fluxo-processo/fluxo-processo-types';
import type { FluxoPercursoCelulaFiltro } from '@/domain/fluxo-processo/fluxo-produtos-hora';
import { useFluxoDisplay } from './fluxo-display-context';
import { fmtQty } from './fluxo-display-scale';
import FluxoPercursoAssadeira from './FluxoPercursoAssadeira';
import FluxoProdutosAssadeira from './FluxoProdutosAssadeira';
import { rotuloAssadeira } from './fluxo-processo-format';

type FluxoPercursoSectionProps = {
  fluxo: VpFluxoPayload;
  ass: string;
  onAssChange: (ass: string) => void;
};

export default function FluxoPercursoSection({
  fluxo,
  ass,
  onAssChange,
}: FluxoPercursoSectionProps) {
  const { scale } = useFluxoDisplay();
  const [filtro, setFiltro] = useState<FluxoPercursoCelulaFiltro | null>(null);

  const etapaNome =
    filtro != null
      ? (fluxo.etapas.find((e) => e.key === filtro.etapa)?.nome ?? filtro.etapa)
      : null;
  const volumeCelula =
    filtro != null ? scale.celula(filtro.etapa, ass, filtro.hora) : 0;

  const trocarAss = (proxima: string) => {
    setFiltro(null);
    onAssChange(proxima);
  };

  return (
    <Card padding="lg">
      <div className="mb-2.5 flex flex-wrap items-baseline gap-2.5">
        <span className="text-base font-bold text-text-strong">Percurso da assadeira</span>
        <span className="text-xs text-text-muted">em que hora ela esteve em cada etapa</span>
      </div>
      <div className="mb-3.5 flex flex-wrap gap-1.5">
        {fluxo.ordemAss.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => trocarAss(a)}
            className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-sm"
            style={{
              border: `1px solid ${ass === a ? fluxo.cores[a] : 'var(--border-default)'}`,
              background:
                ass === a
                  ? `color-mix(in srgb, ${fluxo.cores[a]} 12%, white)`
                  : 'var(--surface-card)',
              color: ass === a ? 'var(--text-strong)' : 'var(--text-muted)',
              fontWeight: ass === a ? 600 : 400,
            }}
          >
            <span
              className="h-[9px] w-[9px] rounded-[2px]"
              style={{ background: fluxo.cores[a] }}
              aria-hidden
            />
            {rotuloAssadeira(a)}
          </button>
        ))}
      </div>
      <FluxoPercursoAssadeira
        fluxo={fluxo}
        ass={ass}
        filtro={filtro}
        onFiltroChange={setFiltro}
      />
      <div className="mt-4 border-t border-stone-100 pt-3">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <div className="text-[10.5px] font-bold uppercase tracking-wide text-text-muted">
            {filtro
              ? `Produtos · ${etapaNome} · ${String(filtro.hora).padStart(2, '0')}:00`
              : 'Produtos rodados nesta assadeira'}
          </div>
          {filtro ? (
            <button
              type="button"
              onClick={() => setFiltro(null)}
              className="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-900 transition-colors duration-150 hover:bg-amber-100"
            >
              <span className="font-mono tabular-nums">
                {fmtQty(volumeCelula, scale.mode)} {scale.unitLabel}
              </span>
              <span className="text-amber-700/80">· limpar</span>
              <span className="material-icons text-[14px]" aria-hidden>
                close
              </span>
            </button>
          ) : null}
        </div>
        <FluxoProdutosAssadeira fluxo={fluxo} ass={ass} filtro={filtro} />
      </div>
    </Card>
  );
}
