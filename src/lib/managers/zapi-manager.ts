/**
 * Z-API Manager
 * Gerencia comunicação com a API do WhatsApp via Z-API
 * 
 * Documentação: https://developer.z-api.io/
 */

import { formatPhoneNumber } from "@/lib/validators/whatsapp";

/**
 * Configuração da Z-API
 */
interface ZApiConfig {
  instanceId: string;
  token: string;
  clientToken: string;
  baseUrl: string;
}

/**
 * Resposta da API Z-API ao enviar mensagem
 */
interface ZApiSendMessageResponse {
  zaapId: string;
  messageId: string;
  id: string;
}

/**
 * Resposta da API Z-API ao checar status
 */
interface ZApiStatusResponse {
  connected: boolean;
  session: string;
  smartphoneConnected: boolean;
}

/**
 * Manager para interações com Z-API
 */
export class ZApiManager {
  private config: ZApiConfig;

  constructor(config?: Partial<ZApiConfig>) {
    // Carrega configuração do ambiente ou usa valores passados
    this.config = {
      instanceId: config?.instanceId ?? process.env.ZAPI_INSTANCE_ID ?? "",
      token: config?.token ?? process.env.ZAPI_TOKEN ?? "",
      clientToken: config?.clientToken ?? process.env.ZAPI_CLIENT_TOKEN ?? "",
      baseUrl: config?.baseUrl ?? process.env.ZAPI_BASE_URL ?? "https://api.z-api.io",
    };

    // Valida que as credenciais estão configuradas
    if (!this.config.instanceId || !this.config.token || !this.config.clientToken) {
      throw new Error(
        "Z-API não configurado. Defina ZAPI_INSTANCE_ID, ZAPI_TOKEN e ZAPI_CLIENT_TOKEN no .env.local"
      );
    }
  }

  /**
   * Monta URL base para requisições à API
   */
  private getBaseUrl(): string {
    return `${this.config.baseUrl}/instances/${this.config.instanceId}/token/${this.config.token}`;
  }

  /**
   * Envia mensagem de texto via WhatsApp
   * 
   * @param phone - Número de telefone no formato +5511999999999
   * @param message - Mensagem a enviar
   * @returns Promise com resposta da API
   */
  async sendMessage(phone: string, message: string): Promise<ZApiSendMessageResponse> {
    const formattedPhone = formatPhoneNumber(phone);

    try {
      const response = await fetch(`${this.getBaseUrl()}/send-text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Client-Token": this.config.clientToken,
        },
        body: JSON.stringify({
          phone: formattedPhone,
          message: message,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Z-API Error: ${response.status} - ${JSON.stringify(errorData)}`
        );
      }

      const data: ZApiSendMessageResponse = await response.json();
      return data;
    } catch (error) {
      console.error("💥 [Z-API] Erro ao enviar mensagem:", error);
      throw error;
    }
  }

  /**
   * Envia mensagem de texto para um grupo WhatsApp
   * 
   * @param groupId - ID do grupo no formato 111111111111@g.us
   * @param message - Mensagem a enviar
   * @returns Promise com resposta da API
   */
  async sendMessageToGroup(groupId: string, message: string): Promise<ZApiSendMessageResponse> {
    try {
      const url = `${this.getBaseUrl()}/send-text`;
      const payload = {
        phone: groupId,
        message: message,
      };

      console.log("🌐 [Z-API] URL:", url);
      console.log("📦 [Z-API] Payload:", JSON.stringify({ ...payload, message: payload.message.substring(0, 100) + "..." }));

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Client-Token": this.config.clientToken,
        },
        body: JSON.stringify(payload),
      });

      console.log("📡 [Z-API] Status da resposta:", response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ [Z-API] Erro na resposta:", errorData);
        throw new Error(
          `Z-API Error: ${response.status} - ${JSON.stringify(errorData)}`
        );
      }

      const data: ZApiSendMessageResponse = await response.json();
      console.log("✅ [Z-API] Resposta da API:", JSON.stringify(data));
      return data;
    } catch (error) {
      console.error("💥 [Z-API] Erro ao enviar mensagem para grupo:", error);
      throw error;
    }
  }

  /**
   * Verifica se a instância está conectada ao WhatsApp
   * 
   * @returns Promise<boolean> - true se conectada, false caso contrário
   */
  async isInstanceConnected(): Promise<boolean> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/status`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Client-Token": this.config.clientToken,
        },
      });

      if (!response.ok) {
        console.error("❌ [Z-API] Erro ao checar status da instância:", response.status);
        return false;
      }

      const data: ZApiStatusResponse = await response.json();
      
      const isConnected = data.connected && data.smartphoneConnected;
      
      console.warn("📱 [Z-API] Status da instância:", {
        connected: data.connected,
        smartphoneConnected: data.smartphoneConnected,
        session: data.session,
      });

      return isConnected;
    } catch (error) {
      console.error("💥 [Z-API] Erro ao verificar conexão:", error);
      return false;
    }
  }

  /**
   * Testa conexão com a API
   * Útil para verificar se as credenciais estão corretas
   * 
   * @returns Promise<boolean> - true se conseguiu se conectar
   */
  async testConnection(): Promise<boolean> {
    try {
      const isConnected = await this.isInstanceConnected();
      if (!isConnected) {
        console.warn("⚠️ [Z-API] Instância não está conectada. Leia o QRCode no painel da Z-API.");
        return false;
      }
      
      console.warn("✅ [Z-API] Conexão OK - Instância conectada e pronta para uso.");
      return true;
    } catch (error) {
      console.error("💥 [Z-API] Erro ao testar conexão:", error);
      return false;
    }
  }
}

/**
 * Instância singleton do ZApiManager
 * Usa as variáveis de ambiente configuradas
 */
export const zapiManager = new ZApiManager();

