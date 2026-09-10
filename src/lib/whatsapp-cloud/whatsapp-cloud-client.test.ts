import { afterEach, describe, expect, it, vi } from 'vitest';
import { WhatsAppCloudClient } from '@/lib/whatsapp-cloud/whatsapp-cloud-client';

const config = {
  accessToken: 'token-de-teste',
  phoneNumberId: '1324603530737972',
  apiVersion: 'v26.0',
  baseUrl: 'https://graph.example.test',
  authTemplateName: 'codigo_acesso_valepan',
  authTemplateLanguage: 'pt_BR',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe('WhatsAppCloudClient', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('envia código no corpo e no botão Copiar código do template', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ messages: [{ id: 'wamid.codigo' }] }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await new WhatsAppCloudClient(config).sendAuthenticationCode(
      '(24) 99999-9999',
      '123456',
    );

    expect(response.messageId).toBe('wamid.codigo');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://graph.example.test/v26.0/1324603530737972/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-de-teste',
        }),
      }),
    );

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({
      messaging_product: 'whatsapp',
      to: '5524999999999',
      type: 'template',
      template: {
        name: 'codigo_acesso_valepan',
        language: { code: 'pt_BR' },
        components: [
          { type: 'body', parameters: [{ type: 'text', text: '123456' }] },
          {
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [{ type: 'text', text: '123456' }],
          },
        ],
      },
    });
  });

  it('considera conectado quando a Meta devolve o número remetente', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ id: config.phoneNumberId, display_phone_number: '+55 24 99999-0000' }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(new WhatsAppCloudClient(config).isConnected()).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://graph.example.test/v26.0/1324603530737972?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token-de-teste',
        }),
      }),
    );
  });

  it('considera desconectado quando a Meta recusa as credenciais', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ error: { message: 'Invalid OAuth access token', code: 190 } }, 401),
      ),
    );

    await expect(new WhatsAppCloudClient(config).isConnected()).resolves.toBe(false);
  });

  it('não está configurado sem token ou phone number id', () => {
    expect(new WhatsAppCloudClient({ ...config, accessToken: '' }).isConfigured()).toBe(
      false,
    );
    expect(new WhatsAppCloudClient({ ...config, phoneNumberId: '' }).isConfigured()).toBe(
      false,
    );
    expect(new WhatsAppCloudClient(config).isConfigured()).toBe(true);
  });
});
