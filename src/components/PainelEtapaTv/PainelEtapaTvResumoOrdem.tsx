import { MetaGapPill } from '@/components/ui/MetaGapPill';
import type { PainelEtapaTvOpProgressoDto } from '@/domain/painel-etapa-tv/painel-etapa-tv-op-progresso';
import { PainelEtapaTvResumoVisual } from '@/domain/painel-etapa-tv/painel-etapa-tv-resumo-visual';
import PainelEtapaTvResumoBarra from './PainelEtapaTvResumoBarra';

const MICRO_LABEL =
  'text-[10px] font-semibold uppercase tracking-wide text-text-muted';

type PainelEtapaTvResumoOrdemProps = {
  progresso: PainelEtapaTvOpProgressoDto;
  titulo: string;
  turnoAgora: boolean;
  unit: string;
  fillClass: string;
  pctClass: string;
};

function fmtQty(n: number): string {
  return n.toLocaleString('pt-BR');
}

function JanelaLinha({ label, value }: { label: string; value: number }) {
  return (
    <p className={MICRO_LABEL}>
      {label}{' '}
      <span className="font-mono text-[13px] tabular-nums text-text-strong">
        {fmtQty(value)}
      </span>
    </p>
  );
}

export default function PainelEtapaTvResumoOrdem({
  progresso,
  titulo,
  turnoAgora,
  unit,
  fillClass,
  pctClass,
}: PainelEtapaTvResumoOrdemProps) {
  const pct = PainelEtapaTvResumoVisual.progressoPct(
    progresso.feito,
    progresso.meta,
  );
  const metaAtingida = progresso.falta === 0 && progresso.meta > 0;
  const barFill = metaAtingida ? 'bg-success' : fillClass;
  const barPctClass = metaAtingida ? 'text-success-fg' : pctClass;

  return (
    <section className="flex min-w-0 flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className={`${MICRO_LABEL} flex min-w-0 items-center gap-1.5`}>
          <span className="truncate">{titulo}</span>
          {turnoAgora ? (
            <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-amber-800">
              agora
            </span>
          ) : null}
        </h2>
        <span
          className={`font-mono text-xs font-bold tabular-nums ${barPctClass}`}
        >
          {Math.round(pct)}%
        </span>
      </div>
      <p className="font-mono text-[1.75rem] font-bold leading-none tabular-nums tracking-[-0.03em] text-text-strong">
        {fmtQty(progresso.feito)}
        <span className="text-[13px] font-semibold text-stone-400"> / </span>
        <span className="text-[13px] font-semibold text-text-muted">
          {fmtQty(progresso.meta)} {unit}
        </span>
      </p>
      <PainelEtapaTvResumoBarra
        pct={pct}
        fillClass={barFill}
        label={`Progresso da ordem: ${Math.round(pct)}%`}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <JanelaLinha label="nesta janela" value={progresso.nestaJanela} />
        <MetaGapPill
          falta={progresso.falta}
          unit={unit}
          metaAtingida={metaAtingida}
          className="px-2 py-1"
        />
      </div>
      {progresso.depoisJanela > 0 ? (
        <JanelaLinha label="depois desta janela" value={progresso.depoisJanela} />
      ) : null}
      {progresso.antesJanela > 0 ? (
        <JanelaLinha label="antes desta janela" value={progresso.antesJanela} />
      ) : null}
    </section>
  );
}
