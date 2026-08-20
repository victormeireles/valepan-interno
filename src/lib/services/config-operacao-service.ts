import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import {
  configOperacaoMapper,
  DEFAULT_CONFIG_OPERACAO,
} from '@/domain/config-operacao/config-operacao-mapper';
import type {
  ConfigOperacaoPatch,
  ConfigOperacaoRow,
  ConfigOperacaoSnapshot,
  ConfigOperacaoTurno,
  ConfigOperacaoTurnoRow,
} from '@/domain/config-operacao/config-operacao-types';
import type { Database } from '@/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';

const SELECT_CONFIG =
  'id, tempo_medio_fermentacao_min, tempo_medio_resfriamento_min, updated_at';
const SELECT_TURNOS = 'etapa, numero, inicio, fim';
const TURNOS_ETAPAS = ['fermentacao', 'forno', 'embalagem'] as const;

const CACHE_TTL_MS = 30_000;

type ServiceClient = SupabaseClient<Database>;

type ConfigOperacaoTableRow = Database['public']['Tables']['config_operacao']['Row'];

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

    const snapshot = await this.loadSnapshot();
    if (snapshot !== DEFAULT_CONFIG_OPERACAO) {
      cachedSnapshot = snapshot;
      cacheExpiresAt = now + CACHE_TTL_MS;
    }
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
    const id = await this.requireConfigId(client);
    await this.persistMinutes(client, id, next);
    if (patch.turnos) {
      await this.replaceTurnos(client, patch.turnos);
    }

    this.invalidateCache();
    return this.getConfig();
  }

  private async loadSnapshot(): Promise<ConfigOperacaoSnapshot> {
    const client = supabaseClientFactory.createServiceRoleClient();
    const row = await this.fetchConfigRow(client);
    if (!row) return DEFAULT_CONFIG_OPERACAO;
    const turnos = await this.fetchTurnos(client);
    if (!turnos) return DEFAULT_CONFIG_OPERACAO;
    return configOperacaoMapper.composeSnapshot(toMapperRow(row), turnos);
  }

  private async fetchConfigRow(
    client: ServiceClient,
  ): Promise<ConfigOperacaoTableRow | null> {
    const { data, error } = await client
      .from('config_operacao')
      .select(SELECT_CONFIG)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('[ConfigOperacaoService] Erro ao ler config:', error.message);
      return null;
    }
    if (!data) {
      console.warn('[ConfigOperacaoService] Nenhuma linha de config encontrada');
      return null;
    }
    return data;
  }

  private async fetchTurnos(
    client: ServiceClient,
  ): Promise<ConfigOperacaoTurnoRow[] | null> {
    const { data, error } = await client
      .from('config_operacao_turnos')
      .select(SELECT_TURNOS);

    if (error) {
      console.warn('[ConfigOperacaoService] Erro ao ler turnos:', error.message);
      return null;
    }
    return data ?? [];
  }

  private async requireConfigId(client: ServiceClient): Promise<string> {
    const { data, error } = await client
      .from('config_operacao')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (error || !data?.id) {
      throw new Error('Configuração de operação não encontrada no banco');
    }
    return data.id;
  }

  private async persistMinutes(
    client: ServiceClient,
    id: string,
    snapshot: ConfigOperacaoSnapshot,
  ): Promise<void> {
    const { error } = await client
      .from('config_operacao')
      .update({
        ...configOperacaoMapper.snapshotToRow(snapshot),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw new Error(error.message ?? 'Falha ao atualizar configuração de operação');
    }
  }

  private async replaceTurnos(
    client: ServiceClient,
    turnos: ConfigOperacaoTurno[],
  ): Promise<void> {
    const { error: deleteError } = await client
      .from('config_operacao_turnos')
      .delete()
      .in('etapa', [...TURNOS_ETAPAS]);

    if (deleteError) {
      throw new Error(deleteError.message ?? 'Falha ao substituir turnos de operação');
    }

    const { error: insertError } = await client
      .from('config_operacao_turnos')
      .insert(turnos.map(toTurnoInsert));

    if (insertError) {
      throw new Error(insertError.message ?? 'Falha ao gravar turnos de operação');
    }
  }
}

function toMapperRow(row: ConfigOperacaoTableRow): ConfigOperacaoRow {
  return {
    tempo_medio_fermentacao_min: row.tempo_medio_fermentacao_min,
    tempo_medio_resfriamento_min: row.tempo_medio_resfriamento_min,
    updated_at: row.updated_at,
  };
}

function toTurnoInsert(turno: ConfigOperacaoTurno) {
  return {
    etapa: turno.etapa,
    numero: turno.numero,
    inicio: turno.inicio,
    fim: turno.fim,
  };
}

export const configOperacaoService = new ConfigOperacaoService();
