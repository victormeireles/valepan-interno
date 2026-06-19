import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type { Database } from '@/types/database';

export type OmieWebhookEventoRow = Database['public']['Tables']['omie_webhook_eventos']['Row'];

export type EmpresaCredenciaisRow = {
  id: string;
  nome: string;
  app_key: string;
  app_secret: string;
};

export class OmieWebhookEventoRepository {
  constructor(
    private readonly supabase: SupabaseClient<Database> = supabaseClientFactory.createServiceRoleClient(),
  ) {}

  async listPendentesRecebimento(limit = 20): Promise<OmieWebhookEventoRow[]> {
    const { data, error } = await this.supabase
      .from('omie_webhook_eventos')
      .select('*')
      .ilike('topic', 'RecebimentoProduto.Concluido')
      .eq('status_processamento', 'pendente')
      .order('received_at', { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(`Erro ao listar eventos Omie pendentes: ${error.message}`);
    }

    return data ?? [];
  }

  async marcarProcessado(id: string): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await this.supabase
      .from('omie_webhook_eventos')
      .update({
        status_processamento: 'processado',
        processed_at: now,
        updated_at: now,
        erro: null,
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao marcar evento Omie como processado: ${error.message}`);
    }
  }

  async marcarErro(id: string, mensagem: string): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await this.supabase
      .from('omie_webhook_eventos')
      .update({
        status_processamento: 'erro',
        erro: mensagem,
        updated_at: now,
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao marcar evento Omie com falha: ${error.message}`);
    }
  }

  async findEmpresaByAppKey(appKey: string): Promise<EmpresaCredenciaisRow | null> {
    const { data, error } = await this.supabase
      .from('empresas')
      .select('id, nome, app_key, app_secret')
      .eq('app_key', appKey)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar empresa por app_key: ${error.message}`);
    }

    return data;
  }

  async findByMessageId(messageId: string): Promise<OmieWebhookEventoRow | null> {
    const { data, error } = await this.supabase
      .from('omie_webhook_eventos')
      .select('*')
      .eq('message_id', messageId)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar evento Omie por message_id: ${error.message}`);
    }

    return data;
  }

  async registrarEvento(input: {
    empresaId: string;
    appKeyRecebida: string;
    topic: string;
    messageId: string | null;
    payloadJson: Database['public']['Tables']['omie_webhook_eventos']['Insert']['payload_json'];
  }): Promise<OmieWebhookEventoRow> {
    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from('omie_webhook_eventos')
      .insert({
        empresa_id: input.empresaId,
        app_key_recebida: input.appKeyRecebida,
        topic: input.topic,
        message_id: input.messageId,
        payload_json: input.payloadJson,
        status_processamento: 'pendente',
        received_at: now,
        updated_at: now,
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(`Erro ao registrar evento Omie: ${error.message}`);
    }

    return data;
  }
}

export const omieWebhookEventoRepository = new OmieWebhookEventoRepository();
