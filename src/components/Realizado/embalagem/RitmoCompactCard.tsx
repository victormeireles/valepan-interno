'use client';

type ComparacaoCompacta = {
  label: string;
  valor: number;
  delta: number | null;
};

type TerminoInfo =
  | { kind: 'hora'; label: string }
  | { kind: 'amanha'; resto: number }
  | { kind: 'indisponivel'; message: string };

export type RitmoCompactCardProps = {
  horaFimLabel: string;
  ritmoValor: number;
  comparacaoOntem: ComparacaoCompacta | null;
  comparacaoSemana: ComparacaoCompacta | null;
  termino: TerminoInfo | null;
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

function ComparacaoLinha({ item }: { item: ComparacaoCompacta }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <span className="text-[11px] text-text-muted">{item.label}</span>
      <span className="font-mono text-[11px] font-medium tabular-nums text-stone-700">
        {Math.round(item.valor)}
      </span>
      <DeltaCompacto delta={item.delta} />
    </span>
  );
}

function TerminoLegenda({ termino }: { termino: TerminoInfo }) {
  return (
    <p className="absolute right-3 top-2.5 flex max-w-[45%] items-center justify-end gap-1 text-right text-xs leading-snug text-stone-500">
      <span className="material-icons shrink-0 text-[14px] text-stone-400" aria-hidden="true">
        schedule
      </span>
      <span>
        {termino.kind === 'hora' ? (
          <>
            término <span className="font-mono tabular-nums">{termino.label}</span>
          </>
        ) : termino.kind === 'amanha' ? (
          <>
            término{' '}
            <span className="font-mono tabular-nums">{termino.resto} cx</span> p/ amanhã
          </>
        ) : (
          termino.message
        )}
      </span>
    </p>
  );
}

export default function RitmoCompactCard({
  horaFimLabel,
  ritmoValor,
  comparacaoOntem,
  comparacaoSemana,
  termino,
}: RitmoCompactCardProps) {
  return (
    <div
      role="group"
      aria-label="Ritmo e previsão de término"
      className="relative min-w-0 rounded-xl border border-border-default bg-surface px-3 py-2.5 shadow-control"
    >
      {termino ? <TerminoLegenda termino={termino} /> : null}

      <div className="flex min-w-0 flex-col justify-center gap-1 pr-24">
        <div className="flex items-center gap-1">
          <span className="material-icons text-[14px] text-accent" aria-hidden="true">
            insights
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
            Ritmo médio · 7h→{horaFimLabel}
          </span>
        </div>

        <div className="flex items-baseline gap-1">
          <span className="font-mono text-[34px] font-extrabold leading-none tabular-nums text-stone-900">
            {Math.round(ritmoValor)}
          </span>
          <span className="text-sm font-medium text-text-muted">cx/h</span>
        </div>

        {(comparacaoOntem || comparacaoSemana) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
            {comparacaoOntem ? <ComparacaoLinha item={comparacaoOntem} /> : null}
            {comparacaoSemana ? <ComparacaoLinha item={comparacaoSemana} /> : null}
          </div>
        )}
      </div>
    </div>
  );
}
