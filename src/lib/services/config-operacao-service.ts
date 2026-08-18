import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import {
  configOperacaoMapper,
  DEFAULT_CONFIG_OPERACAO,
} from '@/domain/config-operacao/config-operacao-mapper';
import type {
  ConfigOperacaoPatch,
  ConfigOperacaoRow,
  ConfigOperacaoSnapshot,
  ConfigOperacaoTurnoRow,
} from '@/domain/config-operacao/config-operacao-types';

const SELECT_COLUMNS =
  'horario_inicio_producao, horario_fim_producao, horario_inicio_forno, horario_fim_forno, horario_inicio_embalagem, horario_fim_embalagem, tempo_medio_fermentacao_min, tempo_medio_resfriamento_min, updated_at';

const CACHE_TTL_MS = 30_000;

type ConfigOperacaoLegacyClockRow = ConfigOperacaoRow & {
  horario_inicio_producao: string;
  horario_fim_producao: string;
  horario_inicio_forno: string;
  horario_fim_forno: string;
  horario_inicio_embalagem: string;
  horario_fim_embalagem: string;
};

function snapshotFromLegacyRow(data: ConfigOperacaoLegacyClockRow): ConfigOperacaoSnapshot {
  const turnos: ConfigOperacaoTurnoRow[] = [
    { etapa: 'fermentacao', numero: 1, inicio: data.horario_inicio_producao, fim: data.horario_fim_producao },
    { etapa: 'forno', numero: 1, inicio: data.horario_inicio_forno, fim: data.horario_fim_forno },
    { etapa: 'embalagem', numero: 1, inicio: data.horario_inicio_embalagem, fim: data.horario_fim_embalagem },
  ];
  return configOperacaoMapper.composeSnapshot(data, turnos);
}

let cachedSnapshot: ConfigOperacaoSnapshot | null = null;
let cacheExpiresAt = 0;

export class ConfigOperacaoService {
  invalidateCache(): void {
    cachedSnapshot = null;
    cacheExpiresAt = 0;
  }

  async getConfig(): Promise<ConfigOperacaoSnapshot> {
    const now = Date.now();
    if (cachedSnapshot && now < cacheExpiresAt) {
      return cachedSnapshot;
    }

    const client = supabaseClientFactory.createServiceRoleClient();
    const { data, error } = await client
      .from('config_operacao')
      .select(SELECT_COLUMNS)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('[ConfigOperacaoService] Erro ao ler config:', error.message);
      return DEFAULT_CONFIG_OPERACAO;
    }

    if (!data) {
      console.warn('[ConfigOperacaoService] Nenhuma linha de config encontrada');
      return DEFAULT_CONFIG_OPERACAO;
    }

    const snapshot = snapshotFromLegacyRow(data as ConfigOperacaoLegacyClockRow);
    cachedSnapshot = snapshot;
    cacheExpiresAt = now + CACHE_TTL_MS;
    return snapshot;
  }

  async updateConfig(patch: ConfigOperacaoPatch): Promise<ConfigOperacaoSnapshot> {
    const current = await this.getConfig();
    const next = configOperacaoMapper.mergeSnapshot(current, patch);
    const invalid = configOperacaoMapper.validateSnapshot(next);
    if (invalid) {
      throw new Error(invalid);
    }

    const client = supabaseClientFactory.createServiceRoleClient();
    const { data: existing, error: readError } = await client
      .from('config_operacao')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (readError || !existing?.id) {
      throw new Error('Configuração de operação não encontrada no banco');
    }

    const { data, error } = await client
      .from('config_operacao')
      .update({
        ...configOperacaoMapper.snapshotToRow(next),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select(SELECT_COLUMNS)
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'Falha ao atualizar configuração de operação');
    }

    this.invalidateCache();
    return snapshotFromLegacyRow(data as ConfigOperacaoLegacyClockRow);
  }
}

export const configOperacaoService = new ConfigOperacaoService();
