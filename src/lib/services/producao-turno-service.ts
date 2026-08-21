import { configOperacaoMapper } from '@/domain/config-operacao/config-operacao-mapper';
import type { ConfigOperacaoSnapshot } from '@/domain/config-operacao/config-operacao-types';
import { TurnoNaoCadastradoError } from '@/domain/producao-turno/producao-turno-numero';
import { ProducaoTurnoPrompt } from '@/domain/producao-turno/producao-turno-prompt';
import type {
  ProducaoTurnoAtivo,
  ProducaoTurnoCadastrado,
  ProducaoTurnoEtapaId,
  ProducaoTurnoNumero,
  ProducaoTurnoPromptDecision,
} from '@/domain/producao-turno/producao-turno-types';
import {
  producaoTurnoAtivoRepository,
  type ProducaoTurnoAtivoStore,
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

export class ProducaoTurnoService {
  constructor(
    private readonly repo: ProducaoTurnoAtivoStore = producaoTurnoAtivoRepository,
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
    await this.assertNumeroCadastrado(etapa, numero);
    await this.repo.upsert({
      etapa,
      numero,
      confirmadoEm: now.toISOString(),
    });
  }

  async assertNumeroCadastrado(
    etapa: ProducaoTurnoEtapaId,
    numero: ProducaoTurnoNumero,
  ): Promise<void> {
    const turnos = await this.turnosDaEtapa(etapa);
    if (!turnos.some((turno) => turno.numero === numero)) {
      throw new TurnoNaoCadastradoError();
    }
  }

  private async turnosDaEtapa(
    etapa: ProducaoTurnoEtapaId,
  ): Promise<ProducaoTurnoCadastrado[]> {
    const snapshot = await this.configSource.getConfig();
    return configOperacaoMapper.turnosDaEtapa(snapshot, etapa);
  }
}

export const producaoTurnoService = new ProducaoTurnoService();
