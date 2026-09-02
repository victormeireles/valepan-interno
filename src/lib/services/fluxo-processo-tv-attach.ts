import { configOperacaoMapper } from '@/domain/config-operacao/config-operacao-mapper';
import type { ConfigOperacaoSnapshot } from '@/domain/config-operacao/config-operacao-types';
import type {
  FluxoApontamentoEvento,
  FluxoEtapaKey,
  VpFluxoPayload,
} from '@/domain/fluxo-processo/fluxo-processo-types';
import {
  PainelEtapaTvTurnosResumo,
  type PainelEtapaTvTurnosResumoDto,
} from '@/domain/painel-etapa-tv/painel-etapa-tv-turnos-resumo';
import type { PainelEtapaTvLoteFonte } from '@/domain/painel-etapa-tv/painel-etapa-tv-types';
import { PainelEtapaTvUltimoLotePicker } from '@/domain/painel-etapa-tv/painel-etapa-tv-ultimo-lote-picker';
import type { ProducaoTurnoEtapaId } from '@/domain/producao-turno/producao-turno-types';

const ETAPA_TURNO: Record<FluxoEtapaKey, ProducaoTurnoEtapaId> = {
  ferm: 'fermentacao',
  forno: 'forno',
  emb: 'embalagem',
};

const ETAPAS: FluxoEtapaKey[] = ['ferm', 'forno', 'emb'];

export type FluxoProcessoTvAttachInput = {
  dateISO: string;
  snapshot: ConfigOperacaoSnapshot;
  fermentacao: FluxoApontamentoEvento[];
  forno: FluxoApontamentoEvento[];
  embalagem: FluxoApontamentoEvento[];
};

/**
 * Anexa `turnosResumo` e `ultimoPorEtapa` a partir dos eventos já mapeados.
 * Domínio permanece puro; config entra pela borda (snapshot).
 */
export class FluxoProcessoTvAttach {
  attach(fluxo: VpFluxoPayload, input: FluxoProcessoTvAttachInput): void {
    const byKey: Record<FluxoEtapaKey, FluxoApontamentoEvento[]> = {
      ferm: input.fermentacao,
      forno: input.forno,
      emb: input.embalagem,
    };
    const turnosResumo = {} as Record<FluxoEtapaKey, PainelEtapaTvTurnosResumoDto>;
    const ultimoPorEtapa = {} as Record<FluxoEtapaKey, PainelEtapaTvLoteFonte[]>;
    for (const key of ETAPAS) {
      turnosResumo[key] = resumoDaEtapa(byKey[key], key, input);
      ultimoPorEtapa[key] = ultimosDaEtapa(byKey[key], key);
    }
    fluxo.turnosResumo = turnosResumo;
    fluxo.ultimoPorEtapa = ultimoPorEtapa;
  }
}

function resumoDaEtapa(
  eventos: FluxoApontamentoEvento[],
  key: FluxoEtapaKey,
  input: FluxoProcessoTvAttachInput,
): PainelEtapaTvTurnosResumoDto {
  const turnos = configOperacaoMapper.turnosDaEtapa(input.snapshot, ETAPA_TURNO[key]);
  return PainelEtapaTvTurnosResumo.fromEventos(
    eventos.map((e) => ({
      volume: volumeOf(e, key),
      turno: e.turno,
      dataOp: e.dataOp ?? '',
    })),
    input.dateISO,
    turnos,
  );
}

function ultimosDaEtapa(
  eventos: FluxoApontamentoEvento[],
  key: FluxoEtapaKey,
): PainelEtapaTvLoteFonte[] {
  return PainelEtapaTvUltimoLotePicker.fromLotesPorOp(
    eventos.flatMap((e) => loteFonteOf(e, key)),
  );
}

function volumeOf(evento: FluxoApontamentoEvento, key: FluxoEtapaKey): number {
  if (key === 'emb') return evento.caixas ?? 0;
  return evento.latas ?? 0;
}

function loteFonteOf(
  evento: FluxoApontamentoEvento,
  key: FluxoEtapaKey,
): PainelEtapaTvLoteFonte[] {
  if (!evento.loteId) return [];
  return [
    {
      loteId: evento.loteId,
      ordemId: evento.ordemProducaoId ?? '',
      produtoNome: evento.produtoNome,
      produzidoEm: evento.produzidoEm,
      quantidade: volumeOf(evento, key),
    },
  ];
}
