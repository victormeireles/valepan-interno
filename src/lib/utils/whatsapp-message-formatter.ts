/**
 * WhatsApp Message Formatter
 * Formata mensagens para envio via WhatsApp
 */

import { isSpecialPhotoClient } from "@/config/photoRules";

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

interface EmbalagemMessageData {
  produto: string;
  cliente: string;
  quantidadeEmbalada: QuantidadeEmbalada;
  metaOriginal?: MetaOriginal;
  isPartial: boolean;
  fotos?: FotosInfo;
}

/**
 * Formatador de mensagens WhatsApp para embalagem
 */
export class WhatsAppMessageFormatter {
  /**
   * Formata quantidade no padrão da UI: "24 cx + 3 pct"
   */
  private formatQuantidade(quantidade: QuantidadeEmbalada): string {
    const parts: string[] = [];
    
    if (quantidade.caixas && quantidade.caixas > 0) {
      parts.push(`${quantidade.caixas} cx`);
    }
    if (quantidade.pacotes && quantidade.pacotes > 0) {
      parts.push(`${quantidade.pacotes} pct`);
    }
    if (quantidade.unidades && quantidade.unidades > 0) {
      parts.push(`${quantidade.unidades} un`);
    }
    if (quantidade.kg && quantidade.kg > 0) {
      parts.push(`${quantidade.kg} kg`);
    }
    
    if (parts.length === 0) {
      return "0";
    }
    
    return parts.join(" + ");
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

  /**
   * Formata seção de fotos na mensagem
   */
  private formatPhotoSection(fotos: FotosInfo | undefined, cliente: string): string {
    const photoStatus = this.getPhotoStatus(fotos, cliente);

    if (photoStatus.status === 'red') {
      // Nenhuma foto - mensagem em MAIÚSCULAS
      const obrigatorias = photoStatus.fotosFaltando.join(' | ');
      return `\n⚠️ *ATENÇÃO: NENHUMA FOTO FOI SALVA!*\n📸 Fotos obrigatórias: ${obrigatorias}`;
    }

    if (photoStatus.status === 'white') {
      // Todas as fotos obrigatórias salvas
      if (isSpecialPhotoClient(cliente)) {
        return `\n📸 Fotos: ✅ Todas salvas (Pacote + Pallet)`;
      }
      return `\n📸 Fotos: ✅ Todas salvas`;
    }

    // Faltam algumas fotos (status yellow)
    let section = `\n📸 Fotos salvas: ${photoStatus.fotosSalvas.join(' | ')}`;
    if (photoStatus.fotosFaltando.length > 0) {
      section += `\n⚠️ Faltando: ${photoStatus.fotosFaltando.join(' | ')}`;
    }
    return section;
  }

  /**
   * Formata mensagem de produção de embalagem
   */
  formatEmbalagemMessage(data: EmbalagemMessageData): string {
    const quantidadeFormatada = this.formatQuantidade(data.quantidadeEmbalada);
    
    let message = `📦 *Produção Embalagem*\n\n`;
    message += `*Produto:* ${data.produto}\n`;
    message += `*Cliente:* ${data.cliente}\n`;
    message += `*Quantidade Embalada:* ${quantidadeFormatada}\n`;
    
    if (data.metaOriginal) {
      const metaFormatada = this.formatQuantidade(data.metaOriginal);
      if (data.isPartial) {
        message += `*Meta Original:* ${metaFormatada}\n`;
      } else {
        message += `*Meta:* ${metaFormatada}\n`;
      }
    }
    
    if (data.isPartial) {
      message += `⚠️ *Salvamento Parcial*\n`;
    }

    // Adicionar seção de fotos
    if (data.fotos !== undefined) {
      message += this.formatPhotoSection(data.fotos, data.cliente);
    }
    
    message += `\n\n---\nGerado automaticamente`;
    
    return message;
  }
}

/**
 * Instância singleton do formatador
 */
export const whatsAppMessageFormatter = new WhatsAppMessageFormatter();

