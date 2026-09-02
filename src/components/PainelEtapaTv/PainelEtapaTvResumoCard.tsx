'use client';

import { Card } from '@/components/ui/Card';
import type { PainelEtapaTvOpProgressoDto } from '@/domain/painel-etapa-tv/painel-etapa-tv-op-progresso';
import { PainelEtapaTvResumoCopy } from '@/domain/painel-etapa-tv/painel-etapa-tv-resumo-copy';
import type { PainelEtapaTvTurnosResumoDto } from '@/domain/painel-etapa-tv/painel-etapa-tv-turnos-resumo';

const MICRO_LABEL =
  'text-[10px] font-semibold uppercase tracking-wide text-text-muted';

type PainelEtapaTvResumoCardProps = {
  progresso: PainelEtapaTvOpProgressoDto;
  turnos: PainelEtapaTvTurnosResumoDto;
  dateISO: string;
  unit: string;
  t1Label: string;
};

function fmtQty(n: number): string {
  return n.toLocaleString('pt-BR');
}

function MicroRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className={MICRO_LABEL}>{label}</span>
      <span className="font-mono text-[13px] tabular-nums text-text-strong">
        {fmtQty(value)}
      </span>
    </div>
  );
}

function OrdemZona({
  progresso,
  dateISO,
  unit,
}: {
  progresso: PainelEtapaTvOpProgressoDto;
  dateISO: string;
  unit: string;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-1.5">
      <h2 className={MICRO_LABEL}>
        Ordem {PainelEtapaTvResumoCopy.ddMm(dateISO)}
      </h2>
      <p className="font-mono text-xl font-bold leading-none tabular-nums text-text-strong">
        {fmtQty(progresso.feito)}
        <span className="text-[13px] font-semibold text-stone-400"> / </span>
        <span className="text-[13px] font-semibold text-text-muted">
          {fmtQty(progresso.meta)} {unit}
        </span>
      </p>
      <div className="mt-1 flex flex-col gap-0.5">
        <MicroRow label="nesta janela" value={progresso.nestaJanela} />
        {progresso.depoisJanela > 0 ? (
          <MicroRow label="depois desta janela" value={progresso.depoisJanela} />
        ) : null}
        {progresso.antesJanela > 0 ? (
          <MicroRow label="antes desta janela" value={progresso.antesJanela} />
        ) : null}
        <MicroRow label="falta" value={progresso.falta} />
      </div>
    </section>
  );
}

function TurnosZona({
  turnos,
  t1Label,
}: {
  turnos: PainelEtapaTvTurnosResumoDto;
  t1Label: string;
}) {
  const outraOpLine = PainelEtapaTvResumoCopy.outraOpLine(
    turnos.outraOp,
    turnos.outraOpData,
  );

  return (
    <section className="flex min-w-0 flex-col gap-1.5">
      <h2 className={MICRO_LABEL}>Turnos {t1Label}</h2>
      <p className="font-mono text-xl font-bold leading-none tabular-nums text-text-strong">
        {fmtQty(turnos.total)}
      </p>
      <div className="mt-1 flex flex-col gap-0.5">
        {turnos.fatias.map((fatia) => (
          <MicroRow
            key={fatia.numero}
            label={PainelEtapaTvResumoCopy.fatiaLabel(fatia)}
            value={fatia.volume}
          />
        ))}
        {turnos.semTurno > 0 ? (
          <MicroRow label="sem turno" value={turnos.semTurno} />
        ) : null}
      </div>
      {outraOpLine ? (
        <p className="mt-1 font-mono text-[13px] tabular-nums text-text-muted">
          {outraOpLine}
        </p>
      ) : null}
    </section>
  );
}

export default function PainelEtapaTvResumoCard({
  progresso,
  turnos,
  dateISO,
  unit,
  t1Label,
}: PainelEtapaTvResumoCardProps) {
  return (
    <Card
      padding="md"
      className="flex h-full min-h-0 flex-col gap-4 overflow-auto border-stone-200 bg-white"
    >
      <OrdemZona progresso={progresso} dateISO={dateISO} unit={unit} />
      <TurnosZona turnos={turnos} t1Label={t1Label} />
    </Card>
  );
}
