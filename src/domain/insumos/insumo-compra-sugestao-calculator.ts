import { insumoCompraDiaOperacional } from './insumo-compra-dia-operacional';
import { insumoCompraJanela } from './insumo-compra-janela';
import { insumoCompraProjecaoCalculator } from './insumo-compra-projecao-calculator';
import type {
  InsumoCompraSugestaoInput,
  InsumoCompraSugestaoResult,
  InsumoCompraSugestaoStatus,
} from './insumo-compra-sugestao-types';

type CalculoContexto = {
  cobertura: number;
  metaEstoque: number;
  quantidadeBruta: number;
  diasAteJanela: number;
  naJanela: boolean;
  rupturaAntesLeadTime: boolean;
  rupturaAntesHorizonte: boolean;
};

export class InsumoCompraSugestaoCalculator {
  calculate(input: InsumoCompraSugestaoInput): InsumoCompraSugestaoResult {
    if (!input.temRegraAtiva) {
      return this.createUnavailableResult('sem_regra', 'Sem regra ativa');
    }
    if (input.consumoDiario <= 0) {
      return this.createUnavailableResult('sem_consumo', 'Sem consumo diário');
    }

    const contexto = this.createContext(input);
    const quantidadeComRisco = this.applyRiskLimits(input, contexto.quantidadeBruta);

    if (contexto.rupturaAntesLeadTime) {
      return this.createResult('urgente', quantidadeComRisco, contexto, 'Cobertura crítica');
    }
    if (!contexto.naJanela && contexto.rupturaAntesHorizonte) {
      return this.createResult(
        'pedir_fora_janela',
        quantidadeComRisco,
        contexto,
        'Cobertura insuficiente até a janela',
      );
    }
    if (contexto.quantidadeBruta <= 0) {
      return this.createResult('ok', null, contexto, 'Estoque na meta');
    }
    if (input.quantidadeMinima != null && contexto.quantidadeBruta < input.quantidadeMinima) {
      return this.calculateBelowMinimum(input, contexto);
    }
    if (contexto.naJanela) {
      const quantidade = this.applyMaximum(contexto.quantidadeBruta, input.quantidadeMaxima);
      return this.createResult('pedir_hoje', quantidade, contexto, 'Repor até a meta');
    }
    return this.createResult('ok', null, contexto, 'Aguardar janela de compra');
  }

  private createContext(input: InsumoCompraSugestaoInput): CalculoContexto {
    const cobertura = insumoCompraDiaOperacional.coberturaCalendarioDias(
      input.estoque,
      input.consumoDiario,
      input.dayOfWeek,
    );
    const demandaLead = insumoCompraDiaOperacional.demandaHorizonte(
      input.consumoDiario,
      input.dayOfWeek,
      input.leadTimeDias,
    );
    const metaEstoque = demandaLead * 1.5;
    const diasAteJanela = insumoCompraJanela.diasAteProximoPermitido(
      input.janelaTipo,
      input.diasSemana,
      input.dayOfWeek,
    );
    const horizonteDias = diasAteJanela + input.leadTimeDias;
    const projecao = insumoCompraProjecaoCalculator.calculate({
      estoque: input.estoque,
      consumoDiario: input.consumoDiario,
      dayOfWeek: input.dayOfWeek,
      leadTimeDias: input.leadTimeDias,
      horizonteDias,
      dataReferencia: input.dataReferencia,
      recebimentos: input.recebimentos,
    });
    const quantidadeBruta = Math.max(0, metaEstoque - projecao.projetadoEmH);
    return {
      cobertura,
      metaEstoque,
      quantidadeBruta,
      diasAteJanela,
      naJanela: diasAteJanela === 0,
      rupturaAntesLeadTime: projecao.rupturaAntesLeadTime,
      rupturaAntesHorizonte: projecao.rupturaAntesHorizonte,
    };
  }

  private calculateBelowMinimum(
    input: InsumoCompraSugestaoInput,
    contexto: CalculoContexto,
  ): InsumoCompraSugestaoResult {
    const quantidadeMinima = input.quantidadeMinima as number;
    const gapLote = quantidadeMinima - contexto.quantidadeBruta;
    const diasAteLoteMinimo = insumoCompraDiaOperacional.diasCalendarioParaDemanda(
      gapLote,
      input.consumoDiario,
      input.dayOfWeek,
    );
    const esperaJanela = contexto.naJanela ? 0 : contexto.diasAteJanela;
    const coberturaNecessaria = esperaJanela + diasAteLoteMinimo + input.leadTimeDias;

    if (contexto.cobertura >= coberturaNecessaria) {
      return this.createResult(
        'adiar_lote_minimo',
        contexto.quantidadeBruta,
        contexto,
        `Aguardar lote mínimo de ${quantidadeMinima}`,
      );
    }

    const status = contexto.naJanela ? 'pedir_hoje' : 'pedir_fora_janela';
    const quantidade = this.applyMaximum(quantidadeMinima, input.quantidadeMaxima);
    return this.createResult(status, quantidade, contexto, 'Pedir lote mínimo para cobertura');
  }

  private applyRiskLimits(input: InsumoCompraSugestaoInput, quantidadeBruta: number): number {
    const quantidadeComMinimo =
      input.quantidadeMinima == null ? quantidadeBruta : Math.max(quantidadeBruta, input.quantidadeMinima);
    return this.applyMaximum(quantidadeComMinimo, input.quantidadeMaxima);
  }

  private applyMaximum(quantidade: number, quantidadeMaxima: number | null): number {
    return quantidadeMaxima == null ? quantidade : Math.min(quantidade, quantidadeMaxima);
  }

  private createResult(
    status: InsumoCompraSugestaoStatus,
    quantidadeSugerida: number | null,
    contexto: CalculoContexto,
    motivo: string,
  ): InsumoCompraSugestaoResult {
    return {
      status,
      quantidadeSugerida,
      coberturaAtualDias: contexto.cobertura,
      metaEstoque: contexto.metaEstoque,
      motivo,
    };
  }

  private createUnavailableResult(
    status: 'sem_regra' | 'sem_consumo',
    motivo: string,
  ): InsumoCompraSugestaoResult {
    return {
      status,
      quantidadeSugerida: null,
      coberturaAtualDias: null,
      metaEstoque: null,
      motivo,
    };
  }
}

export const insumoCompraSugestaoCalculator = new InsumoCompraSugestaoCalculator();
