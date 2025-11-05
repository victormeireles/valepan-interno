/**
 * WhatsApp Notification Service
 * Gerencia envio de notificações via WhatsApp
 */

import { zapiManager } from "@/lib/managers/zapi-manager";
import { whatsAppMessageFormatter } from "@/lib/utils/whatsapp-message-formatter";

interface QuantidadeEmbalada {
  caixas?: number;
  pacotes?: number;
  unidades?: number;
  kg?: number;
}

interface MetaOriginal {
  caixas?: number;
  pacotes?: number;
  unidades?: number;
  kg?: number;
}

interface FotosInfo {
  pacoteFotoUrl?: string;
  etiquetaFotoUrl?: string;
  palletFotoUrl?: string;
}

interface NotifyEmbalagemProductionParams {
  produto: string;
  cliente: string;
  quantidadeEmbalada: QuantidadeEmbalada;
  metaOriginal?: MetaOriginal;
  isPartial: boolean;
  fotos?: FotosInfo;
}

/**
 * Serviço para gerenciar notificações WhatsApp
 */
export class WhatsAppNotificationService {
  /**
   * Notifica grupo de embalagem sobre produção salva
   * 
   * @param params - Dados da produção
   * @returns Promise<boolean> - true se enviado com sucesso, false caso contrário
   */
  async notifyEmbalagemProduction(
    params: NotifyEmbalagemProductionParams
  ): Promise<boolean> {
    try {
      // Verificar se o grupo está configurado
      const grupoId = process.env.WHATSAPP_GRUPO_EMBALAGEM;
      
      if (!grupoId) {
        console.warn("⚠️ [WhatsApp] WHATSAPP_GRUPO_EMBALAGEM não configurado. Notificação não enviada.");
        return false;
      }

      console.log("🔍 [WhatsApp] Grupo ID configurado:", grupoId);

      // Verificar se a instância está conectada
      const isConnected = await zapiManager.isInstanceConnected();
      if (!isConnected) {
        console.warn("⚠️ [WhatsApp] Instância não conectada. Notificação não enviada.");
        return false;
      }

      // Formatar mensagem
      const message = whatsAppMessageFormatter.formatEmbalagemMessage({
        produto: params.produto,
        cliente: params.cliente,
        quantidadeEmbalada: params.quantidadeEmbalada,
        metaOriginal: params.metaOriginal,
        isPartial: params.isPartial,
        fotos: params.fotos,
      });

      console.log("📝 [WhatsApp] Mensagem formatada:", message.substring(0, 100) + "...");
      console.log("📤 [WhatsApp] Enviando mensagem para grupo:", grupoId);

      // Enviar para o grupo
      const response = await zapiManager.sendMessageToGroup(grupoId, message);
      
      console.log("✅ [WhatsApp] Notificação de embalagem enviada com sucesso");
      console.log("📥 [WhatsApp] Resposta da API:", JSON.stringify(response));
      return true;
    } catch (error) {
      // Não propagar erro para não afetar o fluxo principal
      console.error("💥 [WhatsApp] Erro ao enviar notificação de embalagem:", error);
      return false;
    }
  }
}

/**
 * Instância singleton do serviço
 */
export const whatsAppNotificationService = new WhatsAppNotificationService();

