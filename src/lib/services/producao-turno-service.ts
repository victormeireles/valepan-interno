import { configOperacaoMapper } from '@/domain/config-operacao/config-operacao-mapper';
import type { ConfigOperacaoSnapshot } from '@/domain/config-operacao/config-operacao-types';
import { ProducaoTurnoPrompt } from '@/domain/producao-turno/producao-turno-prompt';
import { TurnoRequeridoError } from '@/domain/producao-turno/turno-requerido-error';
import type {
  ProducaoTurnoAtivo,
  ProducaoTurnoCadastrado,
  ProducaoTurnoEtapaId,
  ProducaoTurnoNumero,
  ProducaoTurnoPromptDecision,
} from '@/domain/producao-turno/producao-turno-types';
import {
  producaoTurnoAtivoRepository,
  type ProducaoTurnoAtivoRepository,
} from '@/data/producao-turno/ProducaoTurnoAtivoRepository';
import { configOperacaoService } from '@/lib/services/config-operacao-service';
import { brazilClockMinutes } from '@/lib/utils/date-utils';

export type ProducaoTurnoEstado = {
  ativo: ProducaoTurnoAtivo | null;
  decision: ProducaoTurnoPromptDecision;
  turnos: ProducaoTurnoCadastrado[];
};

export type ProducaoTurnoConfigSource = {
  getConfig(): Promise<ConfigOperacaoSnapshot>;
};

export const TURNO_NAO_CADASTRADO = 'Turno não cadastrado para esta etapa.';

export class ProducaoTurnoService {
  constructor(
    private readonly repo: ProducaoTurnoAtivoRepository = producaoTurnoAtivoRepository,
    private readonly configSource: ProducaoTurnoConfigSource = configOperacaoService,
    private readonly prompt = new ProducaoTurnoPrompt(),
  ) {}

  async getEstado(etapa: ProducaoTurnoEtapaId, now: Date): Promise<ProducaoTurnoEstado> {
    const turnos = await this.turnosDaEtapa(etapa);
    const ativo = await this.repo.findByEtapa(etapa);
    const decision = this.prompt.decide({
      nowMs: now.getTime(),
      agoraMin: brazilClockMinutes(now),
      turnos,
      ativo,
    });
    return { ativo, decision, turnos };
  }

  async confirm(
    etapa: ProducaoTurnoEtapaId,
    numero: ProducaoTurnoNumero,
    now: Date = new Date(),
  ): Promise<void> {
    const turnos = await this.turnosDaEtapa(etapa);
    if (!turnos.some((turno) => turno.numero === numero)) {
      throw new Error(TURNO_NAO_CADASTRADO);
    }
    await this.repo.upsert({
      etapa,
      numero,
      confirmadoEm: now.toISOString(),
    });
  }

  async requireNumero(
    etapa: ProducaoTurnoEtapaId,
    now: Date,
  ): Promise<ProducaoTurnoNumero> {
    const { decision } = await this.getEstado(etapa, now);
    if (decision.kind !== 'nenhum' || decision.numeroAtivo == null) {
      throw new TurnoRequeridoError();
    }
    return decision.numeroAtivo;
  }

  private async turnosDaEtapa(
    etapa: ProducaoTurnoEtapaId,
  ): Promise<ProducaoTurnoCadastrado[]> {
    const snapshot = await this.configSource.getConfig();
    return configOperacaoMapper.turnosDaEtapa(snapshot, etapa);
  }
}

export const producaoTurnoService = new ProducaoTurnoService();
