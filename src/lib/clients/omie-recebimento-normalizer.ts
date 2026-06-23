import type { OmieRecebimentoItem } from '@/domain/types/insumo-estoque';

type OmieCabecRaw = {
  cNumeroNF?: string;
  cNumeroNFe?: string;
  dDataEmissao?: string;
  dEmissaoNFe?: string;
};

type OmieRecebimentoItemRaw = Omit<OmieRecebimentoItem, 'nQtdeNfe'> & {
  nQtdeNfe?: number;
  nQtdeNFe?: number;
};

export type OmieConsultarRecebimentoRaw = {
  cabec?: OmieCabecRaw;
  itensCabec?: OmieRecebimentoItemRaw[];
  itensRecebimento?: Array<{ itensCabec?: OmieRecebimentoItemRaw }>;
};

export type ConsultarRecebimentoNormalizado = {
  cabec?: { cNumeroNF: string; dDataEmissao: string | null };
  itensCabec: OmieRecebimentoItem[];
};

function normalizarItem(raw: OmieRecebimentoItemRaw): OmieRecebimentoItem {
  return {
    nIdItem: raw.nIdItem,
    nIdProduto: raw.nIdProduto,
    cCodigoProduto: raw.cCodigoProduto,
    cDescricaoProduto: raw.cDescricaoProduto,
    cUnidadeNfe: raw.cUnidadeNfe,
    nQtdeNfe: raw.nQtdeNfe ?? raw.nQtdeNFe ?? 0,
    nPrecoUnit: raw.nPrecoUnit,
    vTotalItem: raw.vTotalItem,
    cIgnorarItem: raw.cIgnorarItem,
  };
}

export function normalizarConsultarRecebimento(
  raw: OmieConsultarRecebimentoRaw,
): ConsultarRecebimentoNormalizado {
  const itensDiretos = (raw.itensCabec ?? []).map(normalizarItem);
  const itensAninhados = (raw.itensRecebimento ?? [])
    .map((item) => item.itensCabec)
    .filter((item): item is OmieRecebimentoItemRaw => Boolean(item))
    .map(normalizarItem);

  const cabecRaw = raw.cabec;

  return {
    cabec: cabecRaw
      ? {
          cNumeroNF: cabecRaw.cNumeroNF ?? cabecRaw.cNumeroNFe ?? '',
          dDataEmissao: cabecRaw.dDataEmissao ?? cabecRaw.dEmissaoNFe ?? null,
        }
      : undefined,
    itensCabec: itensDiretos.length > 0 ? itensDiretos : itensAninhados,
  };
}
