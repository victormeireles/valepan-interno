'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  FluxoOndaSelecaoDefault,
  FluxoOndasContextoBuilder,
} from '@/domain/fluxo-processo/fluxo-ondas-contexto';
import type {
  FluxoEtapaKey,
  FluxoOndaAssadeira,
  FluxoOndaSegmento,
  VpFluxoPayload,
} from '@/domain/fluxo-processo/fluxo-processo-types';
import { useFluxoDisplay } from './fluxo-display-context';
import { fmtQty } from './fluxo-display-scale';
import FluxoOndasGrafico from './FluxoOndasGrafico';
import { diaAnteriorLabelFromDia, durOf } from './fluxo-processo-format';

type FluxoOndasAssadeiraProps = {
  fluxo: VpFluxoPayload;
  ondas: FluxoOndaAssadeira[];
  assadeiraNome: string;
  corAssadeira: string;
};

const contextoBuilder = new FluxoOndasContextoBuilder();

/**
 * Ondas da assadeira num gráfico único + lista de seleção.
 */
export default function FluxoOndasAssadeira({
  fluxo,
  ondas,
  assadeiraNome,
  corAssadeira,
}: FluxoOndasAssadeiraProps) {
  const { scale } = useFluxoDisplay();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const ondasKey = ondas.map((o) => o.id).join('|');

  useEffect(() => {
    setSelectedId(FluxoOndaSelecaoDefault.id(ondas));
    // Só reassadeira ou conjunto de ids — evita reset a cada re-fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ondas via ondasKey
  }, [assadeiraNome, ondasKey]);

  const contexto = useMemo(
    () => buildContexto(fluxo, assadeiraNome, ondas),
    [fluxo, assadeiraNome, ondas],
  );
  const embOpAnteriorHoras = fluxo.matrizAnt.emb[assadeiraNome] ?? [];
  const antLabel = diaAnteriorLabelFromDia(fluxo.dia);

  if (ondas.length === 0) {
    return (
      <p className="text-[12.5px] text-text-muted">
        Sem onda casável — falta apontamento em alguma etapa para esta OP/produto.
      </p>
    );
  }

  const selected =
    ondas.find((o) => o.id === selectedId) ?? ondas[0] ?? null;
  const activeId = selected?.id ?? ondas[0].id;

  return (
    <div className="space-y-3">
      <OndasLista
        ondas={ondas}
        selectedId={activeId}
        assadeiraNome={assadeiraNome}
        onSelect={setSelectedId}
      />

      {selected ? (
        <div className="rounded-xl border border-border-default bg-surface p-3 shadow-sm">
          <OndaHeader onda={selected} index={ondas.indexOf(selected) + 1} />
          <div className="mt-2.5">
            <FluxoOndasGrafico
              ondas={ondas}
              selectedId={activeId}
              corAssadeira={corAssadeira}
              contexto={contexto}
              embOpAnteriorHoras={embOpAnteriorHoras}
              antLabel={antLabel}
              unitLabel={scale.unitLabel}
              mode={scale.mode}
              fromUn={(un) => scale.fromUn(un, assadeiraNome)}
              onSelect={setSelectedId}
            />
          </div>
          {selected.produtos.length > 0 ? (
            <div className="mt-2 text-[11px] text-text-muted">
              {selected.produtos
                .filter(
                  (p) =>
                    scale.mode !== 'cx' || scale.temConversaoCaixa(p.nome),
                )
                .slice(0, 3)
                .map(
                  (p) =>
                    `${p.nome} (${fmtQty(scale.fromUn(p.un, assadeiraNome, p.nome), scale.mode)} ${scale.unitLabel})`,
                )
                .join(' · ')}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function buildContexto(
  fluxo: VpFluxoPayload,
  ass: string,
  ondas: FluxoOndaAssadeira[],
): Record<FluxoEtapaKey, FluxoOndaSegmento[]> {
  const etapas: FluxoEtapaKey[] = ['ferm', 'forno', 'emb'];
  const out = {} as Record<FluxoEtapaKey, FluxoOndaSegmento[]>;
  for (const e of etapas) {
    const horas = fluxo.matriz[e][ass] ?? [];
    out[e] = contextoBuilder.build(e, horas, ondas);
  }
  return out;
}

function OndasLista({
  ondas,
  selectedId,
  assadeiraNome,
  onSelect,
}: {
  ondas: FluxoOndaAssadeira[];
  selectedId: string;
  assadeiraNome: string;
  onSelect: (id: string) => void;
}) {
  const { scale } = useFluxoDisplay();

  return (
    <div className="flex min-w-0 gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5" role="listbox" aria-label="Ondas">
      {ondas.map((onda, i) => {
        const active = onda.id === selectedId;
        const vol = fmtQty(
          scale.fromUn(onda.volumeUn, assadeiraNome),
          scale.mode,
        );
        return (
          <button
            key={onda.id}
            type="button"
            role="option"
            aria-selected={active}
            onClick={() => onSelect(onda.id)}
            className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] transition-colors duration-150"
            style={{
              border: `1px solid ${active ? 'var(--color-amber-600, #d97706)' : 'var(--border-default)'}`,
              background: active
                ? 'color-mix(in srgb, #d97706 12%, white)'
                : 'var(--surface-card)',
              color: active ? 'var(--text-strong)' : 'var(--text-muted)',
              fontWeight: active ? 600 : 400,
            }}
          >
            <span>Onda {i + 1}</span>
            <span className="text-text-faint">OP {onda.opLabel}</span>
            <span className="font-mono tabular-nums">
              {vol} {scale.unitLabel}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function OndaHeader({
  onda,
  index,
}: {
  onda: FluxoOndaAssadeira;
  index: number;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-sm font-bold text-text-strong">
          Onda {index}
          <span className="ml-1.5 text-[11px] font-medium text-text-muted">
            OP {onda.opLabel}
          </span>
        </div>
        {onda.embOpAnterior ? (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-900">
            emb. com OP anterior
          </span>
        ) : null}
      </div>
      <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-text-muted">
        {onda.lagFermFornoMedMin != null ? (
          <span>
            espera câmara{' '}
            <strong className="font-mono font-semibold tabular-nums text-text-body">
              {durOf(onda.lagFermFornoMedMin)}
            </strong>
          </span>
        ) : null}
        {onda.lagFornoEmbMedMin != null ? (
          <span>
            pós-forno{' '}
            <strong className="font-mono font-semibold tabular-nums text-text-body">
              {durOf(onda.lagFornoEmbMedMin)}
            </strong>
          </span>
        ) : null}
      </div>
    </div>
  );
}
