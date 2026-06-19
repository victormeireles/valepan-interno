export type OmieWebhookPayload = {
  messageId?: string;
  topic?: string;
  event?: Record<string, unknown>;
  author?: Record<string, unknown>;
  appKey?: string;
  appHash?: string;
  origin?: string;
};

export const OMIE_TOPIC_RECEBIMENTO_CONCLUIDO = 'RecebimentoProduto.Concluido';

export function isRecebimentoProdutoConcluido(topic: string | undefined): boolean {
  return topic?.toLowerCase() === OMIE_TOPIC_RECEBIMENTO_CONCLUIDO.toLowerCase();
}
