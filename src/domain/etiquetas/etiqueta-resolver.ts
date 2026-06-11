import { loteFromDataFabricacaoEtiqueta } from '@/domain/embalagem/lote-from-data-fabricacao';

export type EtiquetaProdutoInput = {
  nome: string;
  nomeEtiqueta: string | null;
  diasValidadeAmbiente: number;
  diasValidadeCongelado: number;
  unitBarcode: string | null;
  unitWeight: number | null;
  boxUnits: number | null;
  packageUnits: number | null;
};

export type EtiquetaTipoInput = {
  congelado: boolean;
  mostrarTextoCongelado: boolean;
};

export type EtiquetaOverrides = {
  nomeEtiqueta?: string;
  diasValidade?: number;
  diasValidadeCongelado?: number;
};

export function resolveEtiquetaConfig(input: {
  produto: EtiquetaProdutoInput;
  tipo: EtiquetaTipoInput;
  dataFabricacao: string;
  overrides?: EtiquetaOverrides;
}) {
  const lote = loteFromDataFabricacaoEtiqueta(input.dataFabricacao) ?? 0;
  return {
    nomeEtiqueta: input.overrides?.nomeEtiqueta?.trim()
      || input.produto.nomeEtiqueta?.trim()
      || input.produto.nome,
    diasValidade: input.overrides?.diasValidade ?? input.produto.diasValidadeAmbiente,
    diasValidadeCongelado:
      input.overrides?.diasValidadeCongelado ?? input.produto.diasValidadeCongelado,
    congelado: input.tipo.congelado,
    mostrarTextoCongelado: input.tipo.mostrarTextoCongelado,
    lote,
    codigoBarras: input.produto.unitBarcode ?? '',
    pesoLiquidoUnitario: input.produto.unitWeight ?? 0,
    unPorCaixa: input.produto.boxUnits ?? 0,
    unPorPacote: input.produto.packageUnits ?? 0,
  };
}
