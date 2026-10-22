import type { ClassificacaoFalta } from './falta-lancamento';
import { parseMedidaFalta, type MedidaFalta } from './falta-medida';

export type FaltaPayloadCampos = {
  classificacao: ClassificacaoFalta;
  justificativa: string | null;
  medida: MedidaFalta | null;
};

export type FaltaEdicaoPatch = {
  classificacao: ClassificacaoFalta;
  justificativa: string | null;
  medida?: MedidaFalta | null;
};

export class FaltaCampos {
  mostraJustificativa(classificacao: ClassificacaoFalta): boolean {
    return classificacao !== 'injustificada';
  }

  mostraMedida(classificacao: ClassificacaoFalta): boolean {
    return classificacao === 'injustificada';
  }

  normalizar(input: {
    classificacao: string;
    justificativa: string;
    medida: string;
  }): FaltaPayloadCampos {
    const classificacao = this.classificacao(input.classificacao);
    const medida = parseMedidaFalta(input.medida);
    if (classificacao === 'injustificada') {
      return { classificacao, justificativa: null, medida };
    }
    const justificativa = input.justificativa.trim() || null;
    return { classificacao, justificativa, medida: null };
  }

  patchEdicao(input: {
    classificacao: string;
    justificativa: string;
    medida?: string;
  }): FaltaEdicaoPatch {
    const valores = this.normalizar({ ...input, medida: input.medida ?? '' });
    if (input.medida === undefined) {
      return { classificacao: valores.classificacao, justificativa: valores.justificativa };
    }
    return valores;
  }

  private classificacao(valor: string): ClassificacaoFalta {
    if (valor === 'pendente' || valor === 'justificada' || valor === 'injustificada') {
      return valor;
    }
    throw new Error('Classificação inválida.');
  }
}
