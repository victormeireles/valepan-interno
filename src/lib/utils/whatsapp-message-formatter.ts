/**
 * WhatsApp Message Formatter
 * Formata mensagens para envio via WhatsApp
 */

import { isSpecialPhotoClient } from "@/config/photoRules";
import {
  QuantityByUnit,
  StageSummaryResult,
} from "@/lib/services/daily-summary";
import { EmbalagemSummaryResult } from "@/lib/services/daily-summary/embalagem-daily-summary-service";

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
  saidaFotoUrl?: string;
}

type StageQuantity = {
  latas?: number;
  unidades?: number;
  kg?: number;
};

type StageQuantityLabels = {
  latas: string;
  unidades: string;
  kg: string;
};

interface StageMessageData {
  produto: string;
  meta: StageQuantity;
  produzido: StageQuantity;
  data?: string;
  turno?: string;
  atualizadoEm?: string;
  summary?: StageSummaryResult;
}

type FermentacaoMessageData = StageMessageData;

type FornoMessageData = StageMessageData;

interface EmbalagemMessageData {
  produto: string;
  cliente: string;
  quantidadeEmbalada: QuantidadeEmbalada;
  metaOriginal?: MetaOriginal;
  isPartial: boolean;
  fotos?: FotosInfo;
  summary?: EmbalagemSummaryResult;
}

interface SaidaMessageData {
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
 * Formatador de mensagens WhatsApp para embalagem
 */
export class WhatsAppMessageFormatter {
  private quantityFormatter = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
  });

  /**
   * Formata quantidade no padrão da UI: "24 cx + 3 pct"
   */
  private formatQuantidade(quantidade: QuantidadeEmbalada): string {
    return this.formatQuantidadeFromEntries([
      { value: quantidade.caixas, label: 'cx' },
      { value: quantidade.pacotes, label: 'pct' },
      { value: quantidade.unidades, label: 'un' },
      { value: quantidade.kg, label: 'kg' },
    ]);
  }

  private formatQuantidadeFromEntries(
    entries: Array<{ value?: number; label: string }>,
  ): string {
    const parts: string[] = [];

    entries.forEach((entry) => {
      if (entry.value && entry.value > 0) {
        parts.push(`${entry.value} ${entry.label}`);
      }
    });

    if (parts.length === 0) {
      return "0";
    }

    return parts.join(" + ");
  }

  private formatStageQuantidade(
    quantidade: StageQuantity,
    labels: StageQuantityLabels,
  ): string {
    return this.formatQuantidadeFromEntries([
      { value: quantidade.latas, label: labels.latas },
      { value: quantidade.unidades, label: labels.unidades },
      { value: quantidade.kg, label: labels.kg },
    ]);
  }

  private formatQuantityByUnit(quantity: QuantityByUnit): string {
    const parts: string[] = [];

    const pushPart = (value: number | undefined, suffix: string) => {
      if (!value || value <= 0) return;
      parts.push(`${this.quantityFormatter.format(value)} ${suffix}`);
    };

    pushPart(quantity.lt, "lt");
    pushPart(quantity.un, "un");
    pushPart(quantity.kg, "kg");
    pushPart(quantity.cx, "cx");
    pushPart(quantity.pct, "pct");

    if (parts.length === 0) return "0";
    return parts.join(" + ");
  }

  private formatDateToBr(date?: string): string {
    if (!date) return "";

    const isoMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return `${day}/${month}/${year}`;
    }

    const parsed = new Date(date);
    if (!Number.isNaN(parsed.getTime())) {
      const day = String(parsed.getDate()).padStart(2, "0");
      const month = String(parsed.getMonth() + 1).padStart(2, "0");
      const year = String(parsed.getFullYear());
      return `${day}/${month}/${year}`;
    }

    return date;
  }

  private formatSummaryLine(
    icon: string,
    label: string,
    totals: { count: number; primary: string; secondary?: string },
  ): string {
    const countLabel = totals.count === 1 ? "1 item" : `${totals.count} itens`;
    const base = `${icon} ${label}: ${countLabel}`;
    if (totals.secondary) {
      return `${base} • ${totals.primary} / ${totals.secondary}`;
    }
    return `${base} • ${totals.primary}`;
  }

  private formatSummaryTotals(summary: StageSummaryResult): string[] {
    const lines: string[] = [];

    lines.push(
      this.formatSummaryLine("✅", "Completos", {
        count: summary.totals.complete.itemCount,
        primary: this.formatQuantityByUnit(summary.totals.complete.produced),
      }),
    );

    lines.push(
      this.formatSummaryLine("⚠️", "Quebra", {
        count: summary.totals.partial.itemCount,
        primary: this.formatQuantityByUnit(summary.totals.partial.produced),
        secondary: this.formatQuantityByUnit(summary.totals.partial.meta ?? {}),
      }),
    );

    lines.push(
      this.formatSummaryLine("⛔️", "Não feitos", {
        count: summary.totals.notProduced.itemCount,
        primary: this.formatQuantityByUnit(summary.totals.notProduced.meta),
      }),
    );

    if (
      summary.totals.notProduced.itemCount > 0 &&
      summary.totals.notProduced.itemCount <= 3
    ) {
      summary.totals.notProduced.highlighted.forEach((item) => {
        lines.push(
          `   • ${item.produto}` +
            (item.cliente ? ` (${item.cliente})` : "") +
            ` — ${this.formatQuantityByUnit(item.quantity)}`,
        );
      });
    }

    return lines;
  }

  private calculateStageDifferences(
    meta: StageQuantity,
    produzido: StageQuantity,
  ) {
    return [
      { key: 'latas' as const, diff: (produzido.latas ?? 0) - (meta.latas ?? 0) },
      {
        key: 'unidades' as const,
        diff: (produzido.unidades ?? 0) - (meta.unidades ?? 0),
      },
      { key: 'kg' as const, diff: (produzido.kg ?? 0) - (meta.kg ?? 0) },
    ];
  }

  private formatStageMessage(
    stage: StageMessageData,
    labels: StageQuantityLabels,
    titulo: string,
    icone: string,
  ): string {
    const metaFormatada = this.formatStageQuantidade(stage.meta, labels);
    const produzidoFormatado = this.formatStageQuantidade(stage.produzido, labels);
    const differences = this.calculateStageDifferences(stage.meta, stage.produzido);
    const isPartial = differences.some((entry) => entry.diff < 0);
    const headerSuffix = isPartial ? ' - Parcial ⚠️' : '';

    const infoLines: string[] = [];
    if (stage.data) {
      infoLines.push(stage.data);
    }
    if (stage.turno) {
      infoLines.push(`Turno: ${stage.turno}`);
    }
    infoLines.push(`Produto: ${stage.produto}`);
    infoLines.push(`Quantidade: ${produzidoFormatado} / ${metaFormatada}`);

    let message = `${icone} *${titulo}${headerSuffix}*\n\n`;
    message += `${infoLines.join('\n')}`;

    if (stage.summary) {
      const summaryLines = this.formatSummaryTotals(stage.summary);
      if (summaryLines.length > 0) {
        message += `\n\nTotal:\n${summaryLines.join('\n')}`;
      }
    }

    return message;
  }

  /**
   * Determina status das fotos e quais estão presentes/faltando
   */
  private getPhotoStatus(fotos: FotosInfo | undefined, cliente: string): {
    status: 'red' | 'yellow' | 'white';
    fotosSalvas: string[];
    fotosFaltando: string[];
  } {
    if (!fotos) {
      return {
        status: 'red',
        fotosSalvas: [],
        fotosFaltando: ['📦 Pacote', '🏷️ Etiqueta', '🚛 Pallet'],
      };
    }

    const hasPacote = Boolean(fotos.pacoteFotoUrl);
    const hasEtiqueta = Boolean(fotos.etiquetaFotoUrl);
    const hasPallet = Boolean(fotos.palletFotoUrl);
    const isSpecial = isSpecialPhotoClient(cliente);

    // Se não tem nenhuma foto
    if (!hasPacote && !hasEtiqueta && !hasPallet) {
      const obrigatorias = isSpecial 
        ? ['📦 Pacote', '🚛 Pallet']
        : ['📦 Pacote', '🏷️ Etiqueta', '🚛 Pallet'];
      
      return {
        status: 'red',
        fotosSalvas: [],
        fotosFaltando: obrigatorias,
      };
    }

    // Determinar fotos obrigatórias baseado no cliente
    const obrigatorias: string[] = [];
    const opcionais: string[] = [];
    
    obrigatorias.push('📦 Pacote');
    if (isSpecial) {
      // Cliente especial: apenas pacote e pallet obrigatórios
      obrigatorias.push('🚛 Pallet');
      if (hasEtiqueta) {
        opcionais.push('🏷️ Etiqueta');
      }
    } else {
      // Cliente normal: pacote, etiqueta e pallet obrigatórios
      obrigatorias.push('🏷️ Etiqueta');
      obrigatorias.push('🚛 Pallet');
    }

    const fotosSalvas: string[] = [];
    const fotosFaltando: string[] = [];

    if (hasPacote) fotosSalvas.push('📦 Pacote');
    else if (obrigatorias.includes('📦 Pacote')) fotosFaltando.push('📦 Pacote');

    if (hasEtiqueta) {
      if (obrigatorias.includes('🏷️ Etiqueta')) fotosSalvas.push('🏷️ Etiqueta');
      else opcionais.push('🏷️ Etiqueta');
    } else if (obrigatorias.includes('🏷️ Etiqueta')) {
      fotosFaltando.push('🏷️ Etiqueta');
    }

    if (hasPallet) fotosSalvas.push('🚛 Pallet');
    else if (obrigatorias.includes('🚛 Pallet')) fotosFaltando.push('🚛 Pallet');

    // Determinar status
    let status: 'red' | 'yellow' | 'white';
    if (fotosFaltando.length === obrigatorias.length) {
      status = 'red';
    } else if (fotosFaltando.length > 0) {
      status = 'yellow';
    } else {
      status = 'white';
    }

    return { status, fotosSalvas, fotosFaltando };
  }

  private hasAllRequiredPhotos(
    fotos: FotosInfo | undefined,
    cliente: string,
  ): boolean {
    const status = this.getPhotoStatus(fotos, cliente);
    return status.status === 'white';
  }

  /**
   * Formata mensagem de produção de embalagem
   */
  formatEmbalagemMessage(data: EmbalagemMessageData): string {
    const quantidadeFormatada = this.formatQuantidade(data.quantidadeEmbalada);
    const metaFormatada = data.metaOriginal
      ? this.formatQuantidade(data.metaOriginal)
      : undefined;
    const quantidadeLinha = metaFormatada
      ? `${quantidadeFormatada} / ${metaFormatada}`
      : quantidadeFormatada;
    const fotoIcon = this.hasAllRequiredPhotos(data.fotos, data.cliente) ? '✅' : '❌';

    const linhas: string[] = [
      `📦 *Produção Embalagem*`,
      ``,
      `*Produto:* ${data.produto}`,
      `*Cliente:* ${data.cliente}`,
      `*Quantidade:* ${quantidadeLinha}`,
      `*Foto:* ${fotoIcon}`,
    ];

    if (data.isPartial) {
      linhas.push(`⚠️ *Salvamento Parcial*`);
    }

    if (data.summary) {
      const summaryLines = this.formatSummaryTotals(data.summary);
      if (summaryLines.length > 0) {
        linhas.push(``, `Total:`, ...summaryLines);
      }
    }

    return linhas.join('\n');
  }

  formatSaidaMessage(data: SaidaMessageData): string {
    const metaFormatada = this.formatQuantidade(data.meta);
    const realizadoFormatado = this.formatQuantidade(data.realizado);

    const diffs = [
      (data.realizado.caixas || 0) - (data.meta.caixas || 0),
      (data.realizado.pacotes || 0) - (data.meta.pacotes || 0),
      (data.realizado.unidades || 0) - (data.meta.unidades || 0),
      (data.realizado.kg || 0) - (data.meta.kg || 0),
    ];

    const isParcial = diffs.some((diff) => diff < 0);
    const excedeu = diffs.some((diff) => diff > 0);

    const header =
      data.origem === 'criada'
        ? '📤 *Nova saída registrada*'
        : '📤 *Saída atualizada*';

    let message = `${header}\n\n`;
    if (data.data) {
      message += `*Data:* ${this.formatDateToBr(data.data)}\n`;
    }
    message += `*Cliente:* ${data.cliente}\n`;
    message += `*Produto:* ${data.produto}\n`;
    if (data.observacao) {
      message += `*Obs Cliente:* ${data.observacao}\n`;
    }
    message += `*Meta:* ${metaFormatada}\n`;
    message += `*Realizado:* ${realizadoFormatado}\n`;

    if (isParcial) {
      message += `⚠️ *Atenção:* Quantidade realizada abaixo da meta\n`;
    } else if (excedeu) {
      message += `ℹ️ Quantidade realizada acima da meta\n`;
    }

    if (data.fotoUrl) {
      message += `📷 Foto: disponível\n${data.fotoUrl}\n`;
    } else {
      message += `📷 Foto ainda não anexada\n`;
    }

    return message;
  }

  formatFermentacaoMessage(data: FermentacaoMessageData): string {
    return this.formatStageMessage(
      data,
      {
        latas: 'lt',
        unidades: 'un',
        kg: 'kg',
      },
      'Fermentação Finalizada',
      '🧪',
    );
  }

  formatFornoMessage(data: FornoMessageData): string {
    return this.formatStageMessage(
      data,
      {
        latas: 'lt',
        unidades: 'un',
        kg: 'kg',
      },
      'Fornada Finalizada',
      '🔥',
    );
  }

}

/**
 * Instância singleton do formatador
 */
export const whatsAppMessageFormatter = new WhatsAppMessageFormatter();

