import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

export type WhatsAppNotificationType =
  | 'embalagem'
  | 'fermentacao'
  | 'forno'
  | 'saidas';

export interface WhatsAppConfigSnapshot {
  embalagem: boolean;
  fermentacao: boolean;
  forno: boolean;
  saidas: boolean;
  updatedAt: string | null;
}

export const DEFAULT_WHATSAPP_CONFIG: WhatsAppConfigSnapshot = {
  embalagem: false,
  fermentacao: false,
  forno: false,
  saidas: false,
  updatedAt: null,
};

type ConfigRow = {
  embalagem_habilitado: boolean;
  fermentacao_habilitado: boolean;
  forno_habilitado: boolean;
  saidas_habilitado: boolean;
  updated_at: string;
};

const CACHE_TTL_MS = 30_000;

let cachedSnapshot: WhatsAppConfigSnapshot | null = null;
let cacheExpiresAt = 0;

export function mapRowToSnapshot(row: ConfigRow): WhatsAppConfigSnapshot {
  return {
    embalagem: row.embalagem_habilitado,
    fermentacao: row.fermentacao_habilitado,
    forno: row.forno_habilitado,
    saidas: row.saidas_habilitado,
    updatedAt: row.updated_at,
  };
}

export function isNotificationTypeEnabled(
  snapshot: WhatsAppConfigSnapshot,
  type: WhatsAppNotificationType,
): boolean {
  return snapshot[type];
}

export type WhatsAppConfigPatch = Partial<
  Pick<WhatsAppConfigSnapshot, 'embalagem' | 'fermentacao' | 'forno' | 'saidas'>
>;

function patchToRow(patch: WhatsAppConfigPatch): Record<string, boolean> {
  const row: Record<string, boolean> = {};
  if (patch.embalagem !== undefined) row.embalagem_habilitado = patch.embalagem;
  if (patch.fermentacao !== undefined) row.fermentacao_habilitado = patch.fermentacao;
  if (patch.forno !== undefined) row.forno_habilitado = patch.forno;
  if (patch.saidas !== undefined) row.saidas_habilitado = patch.saidas;
  return row;
}

export class WhatsAppConfigService {
  invalidateCache(): void {
    cachedSnapshot = null;
    cacheExpiresAt = 0;
  }

  async getConfig(): Promise<WhatsAppConfigSnapshot> {
    const now = Date.now();
    if (cachedSnapshot && now < cacheExpiresAt) {
      return cachedSnapshot;
    }

    const client = supabaseClientFactory.createServiceRoleClient();
    const { data, error } = await client
      .from('whatsapp_notificacoes_config')
      .select(
        'embalagem_habilitado, fermentacao_habilitado, forno_habilitado, saidas_habilitado, updated_at',
      )
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('[WhatsAppConfigService] Erro ao ler config:', error.message);
      return DEFAULT_WHATSAPP_CONFIG;
    }

    if (!data) {
      console.warn('[WhatsAppConfigService] Nenhuma linha de config encontrada');
      return DEFAULT_WHATSAPP_CONFIG;
    }

    const snapshot = mapRowToSnapshot(data as ConfigRow);
    cachedSnapshot = snapshot;
    cacheExpiresAt = now + CACHE_TTL_MS;
    return snapshot;
  }

  async isTypeEnabled(type: WhatsAppNotificationType): Promise<boolean> {
    const config = await this.getConfig();
    return isNotificationTypeEnabled(config, type);
  }

  async updateConfig(patch: WhatsAppConfigPatch): Promise<WhatsAppConfigSnapshot> {
    const rowPatch = patchToRow(patch);
    if (Object.keys(rowPatch).length === 0) {
      return this.getConfig();
    }

    const client = supabaseClientFactory.createServiceRoleClient();
    const { data: existing, error: readError } = await client
      .from('whatsapp_notificacoes_config')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (readError || !existing?.id) {
      throw new Error('Configuração WhatsApp não encontrada no banco');
    }

    const { data, error } = await client
      .from('whatsapp_notificacoes_config')
      .update({ ...rowPatch, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select(
        'embalagem_habilitado, fermentacao_habilitado, forno_habilitado, saidas_habilitado, updated_at',
      )
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'Falha ao atualizar configuração WhatsApp');
    }

    this.invalidateCache();
    return mapRowToSnapshot(data as ConfigRow);
  }
}

export const whatsAppConfigService = new WhatsAppConfigService();
