import {
  isRecebimentoProdutoConcluido,
  type OmieWebhookPayload,
} from '@/domain/types/omie-webhook';
import { OmieWebhookEventoRepository } from '@/data/omie/OmieWebhookEventoRepository';
import type { Json } from '@/types/database';

export type OmieWebhookIngressResult =
  | { status: 'accepted'; eventoId: string }
  | { status: 'duplicate'; eventoId: string }
  | { status: 'ignored'; reason: string };

export class OmieWebhookIngressService {
  constructor(private readonly webhookRepository: OmieWebhookEventoRepository) {}

  async receberRecebimento(payload: OmieWebhookPayload): Promise<OmieWebhookIngressResult> {
    const topic = payload.topic?.trim() ?? '';
    if (!isRecebimentoProdutoConcluido(topic)) {
      return { status: 'ignored', reason: `Tópico não suportado: ${topic || '(vazio)'}` };
    }

    const appKey = payload.appKey?.trim();
    if (!appKey) {
      throw new OmieWebhookIngressError('appKey ausente no payload', 400);
    }

    const empresa = await this.webhookRepository.findEmpresaByAppKey(appKey);
    if (!empresa) {
      throw new OmieWebhookIngressError(
        `Empresa não encontrada para app_key ${appKey}`,
        404,
      );
    }

    const messageId = payload.messageId?.trim() || null;
    if (messageId) {
      const existente = await this.webhookRepository.findByMessageId(messageId);
      if (existente) {
        return { status: 'duplicate', eventoId: existente.id };
      }
    }

    const evento = await this.webhookRepository.registrarEvento({
      empresaId: empresa.id,
      appKeyRecebida: appKey,
      topic,
      messageId,
      payloadJson: payload as Json,
    });

    return { status: 'accepted', eventoId: evento.id };
  }
}

export class OmieWebhookIngressError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'OmieWebhookIngressError';
  }
}

export const omieWebhookIngressService = new OmieWebhookIngressService(
  new OmieWebhookEventoRepository(),
);
