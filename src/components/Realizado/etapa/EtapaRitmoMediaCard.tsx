'use client';

type ComparacaoCompacta = {
  label: string;
  valor: number;
  delta: number | null;
};

function DeltaCompacto({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  if (delta === 0) {
    return (
      <span className="font-mono text-[11px] font-semibold tabular-nums text-stone-400">
        →0%
      </span>
    );
  }
  const positivo = delta > 0;
  return (
    <span
      className={[
        'inline-flex items-center font-mono text-[11px] font-semibold tabular-nums',
        positivo ? 'text-emerald-700' : 'text-danger',
      ].join(' ')}
    >
      <span className="material-icons text-[12px]" aria-hidden="true">
        {positivo ? 'arrow_upward' : 'arrow_downward'}
      </span>
      {Math.abs(delta)}%
    </span>
  );
}

export type EtapaRitmoMediaCardProps = {
  unitLabel: string;
  ritmo: number;
  horaInicioLabel: string;
  horaFimLabel: string;
  comparacaoOntem: ComparacaoCompacta | null;
  comparacaoSemana: ComparacaoCompacta | null;
};

export default function EtapaRitmoMediaCard({
  unitLabel,
  ritmo,
  horaInicioLabel,
  horaFimLabel,
  comparacaoOntem,
  comparacaoSemana,
}: EtapaRitmoMediaCardProps) {
  return (
    <div
      role="group"
      aria-label={`Ritmo médio ${horaInicioLabel} até ${horaFimLabel}`}
      className="rounded-xl border border-border-default bg-surface px-3 py-2.5 shadow-control"
    >
      <div className="flex items-center gap-1">
        <span className="material-icons text-[14px] text-accent" aria-hidden="true">
          insights
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
          Ritmo médio · {horaInicioLabel}→{horaFimLabel}
        </span>
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="font-mono text-[28px] font-extrabold leading-none tabular-nums text-stone-900">
          {ritmo}
        </span>
        <span className="text-sm font-medium text-text-muted">{unitLabel}/h</span>
      </div>
      {(comparacaoOntem || comparacaoSemana) && (
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
          {comparacaoOntem ? (
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <span className="text-[11px] text-text-muted">{comparacaoOntem.label}</span>
              <span className="font-mono text-[11px] font-medium tabular-nums text-stone-700">
                {Math.round(comparacaoOntem.valor)}
              </span>
              <DeltaCompacto delta={comparacaoOntem.delta} />
            </span>
          ) : null}
          {comparacaoSemana ? (
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <span className="text-[11px] text-text-muted">{comparacaoSemana.label}</span>
              <span className="font-mono text-[11px] font-medium tabular-nums text-stone-700">
                {Math.round(comparacaoSemana.valor)}
              </span>
              <DeltaCompacto delta={comparacaoSemana.delta} />
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
