import {
  calcularCustoUnitarioEntrada,
  calcularQuantidadeEntrada,
} from '@/domain/insumos/insumo-entrada-calculo';

const UNIDADES_EMBALAGEM_NF = new Set(['SC', 'S2', 'SAC', 'SACO', 'FD', 'CX', 'UN']);

export type EntradaFatorCorrecaoInput = {
  deltaQuantidade: number;
  custoUnitario: number;
  quantidadeNf: number;
  valorTotalItem: number;
  precoUnitNf: number | null;
  unidadeNf: string | null;
  fatorConversao: number;
};

export function resolverFatorConversaoEntrada(
  fatorInformado: number,
  fatorMapeamento: number | null | undefined,
): number {
  if (fatorMapeamento != null && Number.isFinite(fatorMapeamento) && fatorMapeamento > 0) {
    return fatorMapeamento;
  }

  return fatorInformado;
}

export function isUnidadeNfEmbalagem(unidadeNf: string | null | undefined): boolean {
  const unidade = (unidadeNf ?? '').toUpperCase().trim();
  return UNIDADES_EMBALAGEM_NF.has(unidade);
}

export function isEntradaSemFatorEmbalagem(input: EntradaFatorCorrecaoInput): boolean {
  if (input.fatorConversao <= 1) {
    return false;
  }

  if (!isUnidadeNfEmbalagem(input.unidadeNf)) {
    return false;
  }

  if (Math.abs(input.deltaQuantidade - input.quantidadeNf) > 0.01) {
    return false;
  }

  const precoReferencia =
    input.precoUnitNf != null && input.precoUnitNf > 0
      ? input.precoUnitNf
      : input.valorTotalItem / input.quantidadeNf;

  return Math.abs(input.custoUnitario - precoReferencia) < 0.1;
}

export function corrigirEntradaComFatorEmbalagem(
  input: EntradaFatorCorrecaoInput,
): { deltaQuantidade: number; custoUnitario: number } {
  const deltaQuantidade = calcularQuantidadeEntrada(
    input.quantidadeNf,
    input.fatorConversao,
  );
  const custoUnitario = calcularCustoUnitarioEntrada(
    input.valorTotalItem,
    deltaQuantidade,
  );

  return { deltaQuantidade, custoUnitario };
}

export type PendenciaEntradaFatorInput = {
  quantidadeNf: number;
  valorTotalItem: number;
  precoUnitNf: number | null;
  unidadeNf: string | null;
};

export function recalcularEntradaComFator(
  pendencia: PendenciaEntradaFatorInput,
  fatorConversao: number,
): { deltaQuantidade: number; custoUnitario: number } {
  return corrigirEntradaComFatorEmbalagem({
    deltaQuantidade: 0,
    custoUnitario: 0,
    quantidadeNf: pendencia.quantidadeNf,
    valorTotalItem: pendencia.valorTotalItem,
    precoUnitNf: pendencia.precoUnitNf,
    unidadeNf: pendencia.unidadeNf,
    fatorConversao,
  });
}
