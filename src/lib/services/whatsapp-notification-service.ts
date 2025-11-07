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

/**
 * Serviço para gerenciar notificações WhatsApp
 */
export class WhatsAppNotificationService {
  private getTodayISO(): string {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  private normalizeToISODate(value?: string): string {
    if (!value) return this.getTodayISO();
    const trimmed = value.trim();
    if (!trimmed) return this.getTodayISO();

    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.slice(0, 10);
    }

    const brMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (brMatch) {
      const [, dd, mm, yyyy] = brMatch;
      return `${yyyy}-${mm}-${dd}`;
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }

    return this.getTodayISO();
  }

  private async sendSummaryWithButton(
    stageKey: "fermentacao" | "forno" | "embalagem",
    groupId: string,
    summaryResolver: () => Promise<
      | {
          message: string;
          buttonLabel: string;
          buttonUrl: string;
        }
      | null
    >,
  ): Promise<void> {
    try {
      const summaryPayload = await summaryResolver();
      if (!summaryPayload) return;

      await zapiManager.sendButtonActionsMessage({
        phone: groupId,
        message: summaryPayload.message,
        buttonActions: [
          {
            id: `${stageKey}-open-panel`,
            type: "URL",
            url: summaryPayload.buttonUrl,
            label: summaryPayload.buttonLabel,
          },
        ],
      });
    } catch (error) {
      console.error(`💥 [WhatsApp] Erro ao enviar resumo diário (${stageKey}):`, error);
    }
  }

  private async sendMessageToConfiguredGroup({
    grupoId,
    envVarName,
    stageLabel,
    stageKey,
    buildMessage,
    buildSummary,
  }: {
    grupoId?: string;
    envVarName: string;
    stageLabel: string;
    stageKey: "fermentacao" | "forno" | "embalagem";
    buildMessage: () => string;
    buildSummary?: () => Promise<
      | {
          message: string;
          buttonLabel: string;
          buttonUrl: string;
        }
      | null
    >;
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

      const message = buildMessage();
      console.log(`📝 [WhatsApp] Mensagem de ${stageLabel} formatada:`, `${message.substring(0, 100)}...`);
      console.log(`📤 [WhatsApp] Enviando mensagem de ${stageLabel} para grupo:`, grupoId);

      const response = await zapiManager.sendMessageToGroup(grupoId, message);
      console.log(`✅ [WhatsApp] Notificação de ${stageLabel} enviada com sucesso`);
      console.log(`📥 [WhatsApp] Resposta da API (${stageLabel}):`, JSON.stringify(response));

      if (buildSummary) {
        await this.sendSummaryWithButton(stageKey, grupoId, buildSummary);
      }
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
    return this.sendMessageToConfiguredGroup({
      grupoId: process.env.WHATSAPP_GRUPO_EMBALAGEM,
      envVarName: 'WHATSAPP_GRUPO_EMBALAGEM',
      stageLabel: 'embalagem',
      stageKey: 'embalagem',
      buildMessage: () =>
        whatsAppMessageFormatter.formatEmbalagemMessage({
          produto: params.produto,
          cliente: params.cliente,
          quantidadeEmbalada: params.quantidadeEmbalada,
          metaOriginal: params.metaOriginal,
          isPartial: params.isPartial,
          fotos: params.fotos,
        }),
      buildSummary: () => this.buildEmbalagemSummaryPayload(),
    });
  }

  async notifyFermentacaoProduction(
    params: NotifyFermentacaoProductionParams,
  ): Promise<boolean> {
    return this.sendMessageToConfiguredGroup({
      grupoId: process.env.WHATSAPP_GRUPO_PRODUCAO,
      envVarName: 'WHATSAPP_GRUPO_PRODUCAO',
      stageLabel: 'fermentação',
      stageKey: 'fermentacao',
      buildMessage: () =>
        whatsAppMessageFormatter.formatFermentacaoMessage({
          produto: params.produto,
          meta: params.meta,
          produzido: params.produzido,
          data: params.data,
          turno: params.turno,
          atualizadoEm: params.atualizadoEm,
        }),
      buildSummary: () => this.buildFermentacaoSummaryPayload(params.data),
    });
  }

  async notifyFornoProduction(
    params: NotifyFornoProductionParams,
  ): Promise<boolean> {
    return this.sendMessageToConfiguredGroup({
      grupoId: process.env.WHATSAPP_GRUPO_FORNO,
      envVarName: 'WHATSAPP_GRUPO_FORNO',
      stageLabel: 'forno',
      stageKey: 'forno',
      buildMessage: () =>
        whatsAppMessageFormatter.formatFornoMessage({
          produto: params.produto,
          meta: params.meta,
          produzido: params.produzido,
          data: params.data,
          turno: params.turno,
          atualizadoEm: params.atualizadoEm,
        }),
      buildSummary: () => this.buildFornoSummaryPayload(params.data),
    });
  }

  private async buildFermentacaoSummaryPayload(date?: string) {
    return this.buildStageSummaryPayload(
      'fermentacao',
      () => fermentacaoDailySummaryService.build(this.normalizeToISODate(date)),
      (summary) => whatsAppMessageFormatter.formatFermentacaoDailySummaryMessage(summary),
      'Abrir painel Fermentação',
    );
  }

  private async buildFornoSummaryPayload(date?: string) {
    return this.buildStageSummaryPayload(
      'forno',
      () => fornoDailySummaryService.build(this.normalizeToISODate(date)),
      (summary) => whatsAppMessageFormatter.formatFornoDailySummaryMessage(summary),
      'Abrir painel Forno',
    );
  }

  private async buildEmbalagemSummaryPayload() {
    return this.buildStageSummaryPayload<EmbalagemSummaryResult>(
      'embalagem',
      () => embalagemDailySummaryService.build(this.getTodayISO()),
      (summary) => whatsAppMessageFormatter.formatEmbalagemDailySummaryMessage(summary),
      'Abrir painel Embalagem',
    );
  }

  private async buildStageSummaryPayload<T extends StageSummaryResult>(
    stageKey: 'fermentacao' | 'forno' | 'embalagem',
    loader: () => Promise<T>,
    formatter: (summary: T) => string,
    buttonLabel: string,
  ): Promise<{ message: string; buttonLabel: string; buttonUrl: string } | null> {
    const baseUrl = process.env.NEXTAUTH_URL;
    if (!baseUrl) {
      console.warn(`⚠️ [WhatsApp] NEXTAUTH_URL não configurado. Resumo diário (${stageKey}) não enviado.`);
      return null;
    }

    try {
      const summary = await loader();
      const message = formatter(summary);
      const buttonUrl = `${baseUrl.replace(/\/$/, '')}/realizado/${stageKey}`;
      return { message, buttonLabel, buttonUrl };
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

