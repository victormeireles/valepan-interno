import type { PainelEtapaTvTurnosResumoDto } from '@/domain/painel-etapa-tv/painel-etapa-tv-turnos-resumo';
import { PainelEtapaTvResumoCopy } from '@/domain/painel-etapa-tv/painel-etapa-tv-resumo-copy';
import { PainelEtapaTvResumoVisual } from '@/domain/painel-etapa-tv/painel-etapa-tv-resumo-visual';
import PainelEtapaTvResumoBarra from './PainelEtapaTvResumoBarra';

const MICRO_LABEL =
  'text-[10px] font-semibold uppercase tracking-wide text-text-muted';

type PainelEtapaTvResumoTurnosProps = {
  turnos: PainelEtapaTvTurnosResumoDto;
  t1Label: string;
  fillClass: string;
  vigentes: ReadonlySet<number>;
};

function fmtQty(n: number): string {
  return n.toLocaleString('pt-BR');
}

function FatiaBarra({
  label,
  volume,
  maxVolume,
  fillClass,
  vigente,
}: {
  label: string;
  volume: number;
  maxVolume: number;
  fillClass: string;
  vigente: boolean;
}) {
  const pct = PainelEtapaTvResumoVisual.barraRelativa(volume, maxVolume);
  const vazio = volume <= 0 && !vigente;

  return (
    <div
      className={[
        'grid grid-cols-[minmax(0,7.25rem)_minmax(0,1fr)_auto] items-center gap-2',
        vigente ? 'rounded-lg bg-amber-50 px-1.5 py-1 -mx-1.5' : '',
      ].join(' ')}
    >
      <span
        className={[
          'truncate text-[10px] font-semibold uppercase tracking-wide',
          vigente ? 'text-amber-800' : vazio ? 'text-stone-400' : 'text-text-muted',
        ].join(' ')}
      >
        {label}
      </span>
      <PainelEtapaTvResumoBarra
        pct={pct}
        fillClass={fillClass}
        label={`${label}: ${fmtQty(volume)}`}
        size="turno"
      />
      <span
        className={[
          'min-w-[2.75rem] text-right font-mono text-[13px] tabular-nums',
          vazio ? 'text-stone-400' : 'text-text-strong',
        ].join(' ')}
      >
        {fmtQty(volume)}
      </span>
    </div>
  );
}

export default function PainelEtapaTvResumoTurnos({
  turnos,
  t1Label,
  fillClass,
  vigentes,
}: PainelEtapaTvResumoTurnosProps) {
  const outraOpLine = PainelEtapaTvResumoCopy.outraOpLine(
    turnos.outraOp,
    turnos.outraOpData,
  );
  const maxVolume = PainelEtapaTvResumoVisual.maxVolume([
    ...turnos.fatias.map((fatia) => fatia.volume),
    turnos.semTurno,
  ]);

  return (
    <section className="flex min-w-0 flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className={MICRO_LABEL}>Turnos {t1Label}</h2>
        <p className="font-mono text-lg font-bold leading-none tabular-nums text-text-strong">
          {fmtQty(turnos.total)}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {turnos.fatias.map((fatia) => (
          <FatiaBarra
            key={fatia.numero}
            label={PainelEtapaTvResumoCopy.fatiaLabel(fatia)}
            volume={fatia.volume}
            maxVolume={maxVolume}
            fillClass={fillClass}
            vigente={vigentes.has(fatia.numero)}
          />
        ))}
        {turnos.semTurno > 0 ? (
          <FatiaBarra
            label="sem turno"
            volume={turnos.semTurno}
            maxVolume={maxVolume}
            fillClass={fillClass}
            vigente={false}
          />
        ) : null}
      </div>
      {outraOpLine ? (
        <p className="mt-auto flex items-center gap-1.5 font-mono text-[13px] tabular-nums text-text-muted">
          <span className="material-icons text-base" aria-hidden="true">
            subdirectory_arrow_right
          </span>
          {outraOpLine}
        </p>
      ) : null}
    </section>
  );
}
