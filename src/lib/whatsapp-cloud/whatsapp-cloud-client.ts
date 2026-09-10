import { formatPhoneNumber } from '@/lib/validators/whatsapp';

type WhatsAppCloudConfig = {
  accessToken: string;
  phoneNumberId: string;
  apiVersion: string;
  baseUrl: string;
  authTemplateName: string;
  authTemplateLanguage: string;
};

type GraphErrorBody = {
  error?: {
    message?: string;
    code?: number;
    error_subcode?: number;
    error_data?: { details?: string };
  };
};

type SendMessageResponse = {
  messages?: Array<{ id?: string }>;
};

export type WhatsAppCloudSendResult = {
  id: string;
  messageId: string;
};

function toRecipient(phone: string): string {
  return formatPhoneNumber(phone).replace(/\D/g, '');
}

function toSendResult(data: SendMessageResponse): WhatsAppCloudSendResult {
  const id = data.messages?.[0]?.id;
  if (!id) {
    throw new Error('A Meta não devolveu o identificador da mensagem enviada.');
  }
  return { id, messageId: id };
}

/** Cliente server-side da API oficial do WhatsApp (Meta Cloud API). */
export class WhatsAppCloudClient {
  constructor(private readonly overrides: Partial<WhatsAppCloudConfig> = {}) {}

  private getConfig(): WhatsAppCloudConfig {
    return {
      accessToken:
        this.overrides.accessToken ??
        process.env.WHATSAPP_CLOUD_ACCESS_TOKEN?.trim() ??
        '',
      phoneNumberId:
        this.overrides.phoneNumberId ??
        process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID?.trim() ??
        '',
      apiVersion:
        this.overrides.apiVersion ??
        process.env.WHATSAPP_CLOUD_API_VERSION?.trim() ??
        'v26.0',
      baseUrl:
        this.overrides.baseUrl ??
        process.env.WHATSAPP_CLOUD_GRAPH_BASE_URL?.trim() ??
        'https://graph.facebook.com',
      authTemplateName:
        this.overrides.authTemplateName ??
        process.env.WHATSAPP_CLOUD_AUTH_TEMPLATE_NAME?.trim() ??
        'codigo_acesso_valepan',
      authTemplateLanguage:
        this.overrides.authTemplateLanguage ??
        process.env.WHATSAPP_CLOUD_AUTH_TEMPLATE_LANGUAGE?.trim() ??
        'pt_BR',
    };
  }

  isConfigured(): boolean {
    const config = this.getConfig();
    return Boolean(config.accessToken && config.phoneNumberId);
  }

  isAuthenticationTemplateConfigured(): boolean {
    return Boolean(this.getConfig().authTemplateName);
  }

  async isConnected(): Promise<boolean> {
    if (!this.isConfigured()) return false;
    try {
      const config = this.getConfig();
      await this.request(
        `${config.phoneNumberId}?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status`,
      );
      return true;
    } catch (error) {
      console.error('[WhatsApp Cloud API] Falha ao validar credenciais:', error);
      return false;
    }
  }

  async sendAuthenticationCode(
    phone: string,
    code: string,
  ): Promise<WhatsAppCloudSendResult> {
    const config = this.getConfig();
    if (!config.authTemplateName) {
      throw new Error('Template de autenticação do WhatsApp ainda não configurado.');
    }

    return this.send({
      to: toRecipient(phone),
      type: 'template',
      template: {
        name: config.authTemplateName,
        language: { code: config.authTemplateLanguage },
        components: [
          {
            type: 'body',
            parameters: [{ type: 'text', text: code }],
          },
          {
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [{ type: 'text', text: code }],
          },
        ],
      },
    });
  }

  private async send(
    payload: Record<string, unknown>,
  ): Promise<WhatsAppCloudSendResult> {
    const config = this.getConfig();
    const data = await this.request<SendMessageResponse>(
      `${config.phoneNumberId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({ messaging_product: 'whatsapp', ...payload }),
      },
    );
    return toSendResult(data);
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const config = this.getConfig();
    if (!config.accessToken || !config.phoneNumberId) {
      throw new Error(
        'WhatsApp Cloud API não configurada. Defina WHATSAPP_CLOUD_ACCESS_TOKEN e WHATSAPP_CLOUD_PHONE_NUMBER_ID.',
      );
    }

    const response = await fetch(
      `${config.baseUrl.replace(/\/$/, '')}/${config.apiVersion}/${path.replace(/^\//, '')}`,
      {
        ...init,
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
          ...init?.headers,
        },
      },
    );

    const data = (await response.json().catch(() => ({}))) as T & GraphErrorBody;
    if (!response.ok) {
      throw new Error(this.formatGraphError(response.status, data.error));
    }
    return data;
  }

  private formatGraphError(
    status: number,
    graphError: GraphErrorBody['error'],
  ): string {
    const code = graphError?.code ? ` código ${graphError.code}` : '';
    const subcode = graphError?.error_subcode ? `/${graphError.error_subcode}` : '';
    const details =
      graphError?.error_data?.details ?? graphError?.message ?? 'erro não informado';
    return `WhatsApp Cloud API (${status}${code}${subcode}): ${details}`;
  }
}

export const whatsappCloudClient = new WhatsAppCloudClient();
