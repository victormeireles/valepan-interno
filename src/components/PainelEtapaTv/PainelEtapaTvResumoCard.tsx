'use client';

import { Card } from '@/components/ui/Card';
import { getEtapaAccentClasses } from '@/components/Realizado/etapa/etapa-accent';
import type { RealizadoEtapaAccent } from '@/components/Realizado/etapa/types';
import type { PainelEtapaTvOpProgressoDto } from '@/domain/painel-etapa-tv/painel-etapa-tv-op-progresso';
import { PainelEtapaTvResumoCopy } from '@/domain/painel-etapa-tv/painel-etapa-tv-resumo-copy';
import { PainelEtapaTvTurnoVigente } from '@/domain/painel-etapa-tv/painel-etapa-tv-turno-vigente';
import type { PainelEtapaTvTurnosResumoDto } from '@/domain/painel-etapa-tv/painel-etapa-tv-turnos-resumo';
import { brazilClockMinutes } from '@/lib/utils/date-utils';
import PainelEtapaTvResumoOrdem from './PainelEtapaTvResumoOrdem';
import PainelEtapaTvResumoTurnos from './PainelEtapaTvResumoTurnos';

type PainelEtapaTvResumoCardProps = {
  progresso: PainelEtapaTvOpProgressoDto;
  turnos: PainelEtapaTvTurnosResumoDto;
  unit: string;
  t1Label: string;
  accent: RealizadoEtapaAccent;
};

export default function PainelEtapaTvResumoCard({
  progresso,
  turnos,
  unit,
  t1Label,
  accent,
}: PainelEtapaTvResumoCardProps) {
  const accentClasses = getEtapaAccentClasses(accent);
  const fillClass = accentClasses.progressFill;
  const pctClass = accentClasses.progressText;
  const agoraMin = brazilClockMinutes(new Date());
  const vigentes = PainelEtapaTvTurnoVigente.numeros(turnos.fatias, agoraMin);
  const vigente = PainelEtapaTvTurnoVigente.primeiro(turnos.fatias, agoraMin);
  const titulo = vigente
    ? PainelEtapaTvResumoCopy.fatiaLabel(vigente)
    : 'Progresso';

  return (
    <Card
      padding="md"
      className="flex h-full min-h-min flex-col gap-3 overflow-hidden border-stone-200 bg-white"
    >
      <PainelEtapaTvResumoOrdem
        progresso={progresso}
        titulo={titulo}
        turnoAgora={vigente !== null}
        unit={unit}
        fillClass={fillClass}
        pctClass={pctClass}
      />
      <hr className="border-stone-100" />
      <PainelEtapaTvResumoTurnos
        turnos={turnos}
        t1Label={t1Label}
        fillClass={fillClass}
        vigentes={vigentes}
      />
    </Card>
  );
}
