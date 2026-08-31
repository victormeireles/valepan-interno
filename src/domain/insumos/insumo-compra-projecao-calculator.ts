import { offsetDiasIso } from './insumo-compra-data-offset';
import { insumoCompraDiaOperacional } from './insumo-compra-dia-operacional';

export type InsumoCompraRecebimentoInput = {
  quantidade: number;
  dataEfetiva: string;
};

export type InsumoCompraProjecaoInput = {
  estoque: number;
  consumoDiario: number;
  dayOfWeek: number;
  leadTimeDias: number;
  horizonteDias: number;
  dataReferencia: string;
  recebimentos: InsumoCompraRecebimentoInput[];
};

export type InsumoCompraProjecaoResult = {
  demandaH: number;
  recebimentosAteH: number;
  projetadoEmH: number;
  rupturaAntesLeadTime: boolean;
  rupturaAntesHorizonte: boolean;
};

export class InsumoCompraProjecaoCalculator {
  calculate(input: InsumoCompraProjecaoInput): InsumoCompraProjecaoResult {
    const demandaH = insumoCompraDiaOperacional.demandaHorizonte(
      input.consumoDiario,
      input.dayOfWeek,
      input.horizonteDias,
    );
    const porOffset = this.agruparRecebimentosPorOffset(input);
    const recebimentosAteH = this.somarRecebimentosAteH(porOffset, input.horizonteDias);
    const rupturas = this.simularRupturas(input, porOffset);

    return {
      demandaH,
      recebimentosAteH,
      projetadoEmH: input.estoque - demandaH + recebimentosAteH,
      rupturaAntesLeadTime: rupturas.antesLeadTime,
      rupturaAntesHorizonte: rupturas.antesHorizonte,
    };
  }

  private agruparRecebimentosPorOffset(
    input: InsumoCompraProjecaoInput,
  ): Map<number, number> {
    const porOffset = new Map<number, number>();
    for (const recebimento of input.recebimentos) {
      const offset = offsetDiasIso(input.dataReferencia, recebimento.dataEfetiva);
      porOffset.set(offset, (porOffset.get(offset) ?? 0) + recebimento.quantidade);
    }
    return porOffset;
  }

  private somarRecebimentosAteH(
    porOffset: Map<number, number>,
    horizonteDias: number,
  ): number {
    let total = 0;
    for (const [offset, quantidade] of porOffset) {
      if (offset >= 0 && offset <= horizonteDias) {
        total += quantidade;
      }
    }
    return total;
  }

  private simularRupturas(
    input: InsumoCompraProjecaoInput,
    porOffset: Map<number, number>,
  ): { antesLeadTime: boolean; antesHorizonte: boolean } {
    let saldo = input.estoque;
    let antesLeadTime = false;
    let antesHorizonte = false;

    for (let offset = 0; offset < input.horizonteDias; offset++) {
      saldo += porOffset.get(offset) ?? 0;
      if (saldo <= 0) {
        antesHorizonte = true;
        if (offset < input.leadTimeDias) {
          antesLeadTime = true;
        }
      }
      const dow = (input.dayOfWeek + offset) % 7;
      saldo -= input.consumoDiario * insumoCompraDiaOperacional.pesoDia(dow);
    }

    return { antesLeadTime, antesHorizonte };
  }
}

export const insumoCompraProjecaoCalculator = new InsumoCompraProjecaoCalculator();
