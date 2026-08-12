import type { InsumoCompraJanelaTipo } from './insumo-compra-janela';

export type InsumoCompraRegraDistribuidorInput = {
  nome: string;
  preferencial: boolean;
};

export type InsumoCompraRegraValidatorInput = {
  janelaTipo: InsumoCompraJanelaTipo;
  diasSemana: number[] | null;
  quantidadeMinima: number | null;
  quantidadeMaxima: number | null;
  distribuidores: InsumoCompraRegraDistribuidorInput[];
};

export type InsumoCompraRegraValidatorResult =
  | { ok: true }
  | { ok: false; erros: string[] };

export class InsumoCompraRegraValidator {
  validate(input: InsumoCompraRegraValidatorInput): InsumoCompraRegraValidatorResult {
    const erros: string[] = [];

    if (
      input.quantidadeMinima != null &&
      input.quantidadeMaxima != null &&
      input.quantidadeMinima > input.quantidadeMaxima
    ) {
      erros.push('Quantidade mínima não pode ser maior que a máxima.');
    }

    if (input.janelaTipo === 'dias_semana') {
      const dias = input.diasSemana ?? [];
      if (dias.length === 0) {
        erros.push('Selecione ao menos um dia da semana.');
      }
    }

    const preferenciais = input.distribuidores.filter((d) => d.preferencial);
    if (preferenciais.length > 1) {
      erros.push('Apenas um distribuidor pode ser preferencial.');
    }

    for (const distribuidor of input.distribuidores) {
      if (distribuidor.nome.trim().length === 0) {
        erros.push('Nome do distribuidor é obrigatório.');
        break;
      }
    }

    if (erros.length > 0) {
      return { ok: false, erros };
    }

    return { ok: true };
  }
}

export const insumoCompraRegraValidator = new InsumoCompraRegraValidator();
