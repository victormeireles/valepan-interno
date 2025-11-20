/**
 * WhatsApp Notification Service
 * Gerencia envio de notificações via WhatsApp
 */

import { zapiManager } from "@/lib/managers/zapi-manager";
import {
  EmbalagemSummaryResult,
  embalagemDailySummaryService,
  fermentacaoDailySummaryService,
  fornoDailySummaryService,
  StageSummaryResult,
} from "@/lib/services/daily-summary";
import { whatsAppMessageFormatter } from "@/lib/utils/whatsapp-message-formatter";
import {
  getTodayISOInBrazilTimezone,
  normalizeToISODate as normalizeToISODateBrazil,
} from "@/lib/utils/date-utils";

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

interface StageQuantities {
  latas?: number;
  unidades?: number;
  kg?: number;
}

interface NotifyEmbalagemProductionParams {
  produto: string;
  cliente: string;
  quantidadeEmbalada: QuantidadeEmbalada;
  metaOriginal?: MetaOriginal;
  isPartial: boolean;
  fotos?: FotosInfo;
  obsEmbalagem?: string;
}

interface StageNotificationParams {
  produto: string;
  meta: StageQuantities;
  produzido: StageQuantities;
  data?: string;
  turno?: string;
  atualizadoEm?: string;
}

type NotifyFermentacaoProductionParams = StageNotificationParams;

type NotifyFornoProductionParams = StageNotificationParams;

interface NotifySaidasProductionParams {
  produto: string;
  cliente: string;
  meta: QuantidadeEmbalada;
  realizado: QuantidadeEmbalada;
  data?: string;
  observacao?: string;
  origem: 'criada' | 'atualizada';
  fotoUrl?: string;
}

/**
 * Serviço para gerenciar notificações WhatsApp
 */
export class WhatsAppNotificationService {

  private async sendMessageToConfiguredGroup<TSummary>({
    grupoId,
    envVarName,
    stageLabel,
    buildMessage,
    fetchSummary,
  }: {
    grupoId?: string;
    envVarName: string;
    stageLabel: string;
    buildMessage: (summary?: TSummary) => string;
    fetchSummary?: () => Promise<TSummary | null>;
  }): Promise<boolean> {
    try {
      if (!grupoId) {
        console.warn(`⚠️ [WhatsApp] ${envVarName} não configurado. Notificação de ${stageLabel} não enviada.`);
        return false;
      }

      console.log(`🔍 [WhatsApp] Grupo ${stageLabel} configurado:`, grupoId);

      const isConnected = await zapiManager.isInstanceConnected();
      if (!isConnected) {
        console.warn(`⚠️ [WhatsApp] Instância não conectada. Notificação de ${stageLabel} não enviada.`);
        return false;
      }

      let summaryData: TSummary | undefined;
      if (fetchSummary) {
        try {
          summaryData = await fetchSummary() ?? undefined;
        } catch (error) {
          console.error(`💥 [WhatsApp] Falha ao montar resumo (${stageLabel}):`, error);
        }
      }

      const message = buildMessage(summaryData);
      console.log(`📝 [WhatsApp] Mensagem de ${stageLabel} formatada:`, `${message.substring(0, 100)}...`);
      console.log(`📤 [WhatsApp] Enviando mensagem de ${stageLabel} para grupo:`, grupoId);

      const response = await zapiManager.sendMessageToGroup(grupoId, message);
      console.log(`✅ [WhatsApp] Notificação de ${stageLabel} enviada com sucesso`);
      console.log(`📥 [WhatsApp] Resposta da API (${stageLabel}):`, JSON.stringify(response));

      return true;
    } catch (error) {
      console.error(`💥 [WhatsApp] Erro ao enviar notificação de ${stageLabel}:`, error);
      return false;
    }
  }

  /**
   * Notifica grupo de embalagem sobre produção salva
   * 
   * @param params - Dados da produção
   * @returns Promise<boolean> - true se enviado com sucesso, false caso contrário
   */
  async notifyEmbalagemProduction(
    params: NotifyEmbalagemProductionParams
  ): Promise<boolean> {
    return this.sendMessageToConfiguredGroup<EmbalagemSummaryResult>({
      grupoId: process.env.WHATSAPP_GRUPO_EMBALAGEM,
      envVarName: 'WHATSAPP_GRUPO_EMBALAGEM',
      stageLabel: 'embalagem',
      buildMessage: (summary) =>
        whatsAppMessageFormatter.formatEmbalagemMessage({
          produto: params.produto,
          cliente: params.cliente,
          quantidadeEmbalada: params.quantidadeEmbalada,
          metaOriginal: params.metaOriginal,
          isPartial: params.isPartial,
          fotos: params.fotos,
          obsEmbalagem: params.obsEmbalagem,
          summary,
        }),
      fetchSummary: () => this.loadEmbalagemSummary(),
    });
  }

  async notifyFermentacaoProduction(
    params: NotifyFermentacaoProductionParams,
  ): Promise<boolean> {
    return this.sendMessageToConfiguredGroup<StageSummaryResult>({
      grupoId: process.env.WHATSAPP_GRUPO_PRODUCAO,
      envVarName: 'WHATSAPP_GRUPO_PRODUCAO',
      stageLabel: 'fermentação',
      buildMessage: (summary) =>
        whatsAppMessageFormatter.formatFermentacaoMessage({
          produto: params.produto,
          meta: params.meta,
          produzido: params.produzido,
          data: params.data,
          turno: params.turno,
          atualizadoEm: params.atualizadoEm,
          summary,
        }),
      fetchSummary: () => this.loadFermentacaoSummary(params.data),
    });
  }

  async notifyFornoProduction(
    params: NotifyFornoProductionParams,
  ): Promise<boolean> {
    return this.sendMessageToConfiguredGroup<StageSummaryResult>({
      grupoId: process.env.WHATSAPP_GRUPO_FORNO,
      envVarName: 'WHATSAPP_GRUPO_FORNO',
      stageLabel: 'forno',
      buildMessage: (summary) =>
        whatsAppMessageFormatter.formatFornoMessage({
          produto: params.produto,
          meta: params.meta,
          produzido: params.produzido,
          data: params.data,
          turno: params.turno,
          atualizadoEm: params.atualizadoEm,
          summary,
        }),
      fetchSummary: () => this.loadFornoSummary(params.data),
    });
  }

  async notifySaidasProduction(
    params: NotifySaidasProductionParams,
  ): Promise<boolean> {
    return this.sendMessageToConfiguredGroup({
      grupoId: process.env.WHATSAPP_GRUPO_SAIDAS,
      envVarName: 'WHATSAPP_GRUPO_SAIDAS',
      stageLabel: 'saídas',
      buildMessage: () =>
        whatsAppMessageFormatter.formatSaidaMessage({
          produto: params.produto,
          cliente: params.cliente,
          meta: params.meta,
          realizado: params.realizado,
          data: params.data,
          observacao: params.observacao,
          origem: params.origem,
          fotoUrl: params.fotoUrl,
        }),
    });
  }

  private async loadFermentacaoSummary(
    date?: string,
  ): Promise<StageSummaryResult | null> {
    return this.tryLoadSummary('fermentacao', () =>
      fermentacaoDailySummaryService.build(normalizeToISODateBrazil(date)),
    );
  }

  private async loadFornoSummary(
    date?: string,
  ): Promise<StageSummaryResult | null> {
    return this.tryLoadSummary('forno', () =>
      fornoDailySummaryService.build(normalizeToISODateBrazil(date)),
    );
  }

  private async loadEmbalagemSummary(): Promise<EmbalagemSummaryResult | null> {
    return this.tryLoadSummary('embalagem', () =>
      embalagemDailySummaryService.build(getTodayISOInBrazilTimezone()),
    );
  }

  private async tryLoadSummary<T extends StageSummaryResult>(
    stageKey: 'fermentacao' | 'forno' | 'embalagem' | 'saidas',
    loader: () => Promise<T>,
  ): Promise<T | null> {
    try {
      return await loader();
    } catch (error) {
      console.error(`💥 [WhatsApp] Falha ao montar resumo diário (${stageKey}):`, error);
      return null;
    }
  }
}

/**
 * Instância singleton do serviço
 */
export const whatsAppNotificationService = new WhatsAppNotificationService();

