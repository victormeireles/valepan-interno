import type { OmieRecebimentoItem } from '@/domain/types/insumo-estoque';
import type { OmieRecebimentoCabecEnriquecido } from '@/domain/types/omie-recebimento-enriquecido';

type OmieCabecRaw = {
  cNumeroNF?: string;
  cNumeroNFe?: string;
  dDataEmissao?: string;
  dEmissaoNFe?: string;
  cRazaoSocial?: string;
  cNome?: string;
  cCNPJ_CPF?: string;
  cNaturezaOperacao?: string;
  nValorNFe?: number;
  cChaveNFe?: string;
};

type OmieItensAjustesRaw = {
  cCFOPEntrada?: string;
};

type OmieRecebimentoItemRaw = Omit<OmieRecebimentoItem, 'nQtdeNfe' | 'cfopEntrada' | 'ncm'> & {
  nQtdeNfe?: number;
  nQtdeNFe?: number;
  cNCM?: string;
  cCodigoNCM?: string;
};

type OmieRecebimentoLinhaRaw = {
  itensCabec?: OmieRecebimentoItemRaw;
  itensAjustes?: OmieItensAjustesRaw;
};

export type OmieConsultarRecebimentoRaw = {
  cabec?: OmieCabecRaw;
  itensCabec?: OmieRecebimentoItemRaw[];
  itensRecebimento?: OmieRecebimentoLinhaRaw[];
};

export type ConsultarRecebimentoNormalizado = {
  cabec?: OmieRecebimentoCabecEnriquecido;
  itensCabec: OmieRecebimentoItem[];
};

function normalizarCabec(raw?: OmieCabecRaw): OmieRecebimentoCabecEnriquecido | undefined {
  if (!raw) return undefined;

  return {
    cNumeroNF: raw.cNumeroNF ?? raw.cNumeroNFe ?? '',
    dDataEmissao: raw.dDataEmissao ?? raw.dEmissaoNFe ?? null,
    fornecedorRazaoSocial: raw.cRazaoSocial?.trim() || null,
    fornecedorNome: raw.cNome?.trim() || null,
    fornecedorCnpj: raw.cCNPJ_CPF?.trim() || null,
    naturezaOperacao: raw.cNaturezaOperacao?.trim() || null,
    valorTotalNf:
      raw.nValorNFe != null && Number.isFinite(Number(raw.nValorNFe))
        ? Number(raw.nValorNFe)
        : null,
    chaveNfe: raw.cChaveNFe?.trim() || null,
  };
}

function normalizarItem(
  raw: OmieRecebimentoItemRaw,
  ajustes?: OmieItensAjustesRaw,
): OmieRecebimentoItem {
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
    cfopEntrada: ajustes?.cCFOPEntrada?.trim() || null,
    ncm: raw.cNCM?.trim() || raw.cCodigoNCM?.trim() || null,
  };
}

function normalizarItensRecebimento(linhas: OmieRecebimentoLinhaRaw[]): OmieRecebimentoItem[] {
  return linhas
    .map((linha) => {
      if (!linha.itensCabec) return null;
      return normalizarItem(linha.itensCabec, linha.itensAjustes);
    })
    .filter((item): item is OmieRecebimentoItem => item !== null);
}

export function normalizarConsultarRecebimento(
  raw: OmieConsultarRecebimentoRaw,
): ConsultarRecebimentoNormalizado {
  const itensDiretos = (raw.itensCabec ?? []).map((item) => normalizarItem(item));
  const itensAninhados = normalizarItensRecebimento(raw.itensRecebimento ?? []);

  return {
    cabec: normalizarCabec(raw.cabec),
    itensCabec: itensDiretos.length > 0 ? itensDiretos : itensAninhados,
  };
}
