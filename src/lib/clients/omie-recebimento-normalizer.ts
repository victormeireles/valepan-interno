import type { OmieRecebimentoItem } from '@/domain/types/insumo-estoque';
import type {
  OmieRecebimentoCabecEnriquecido,
  OmieRecebimentoInfoAdicionais,
} from '@/domain/types/omie-recebimento-enriquecido';

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

type OmieInfoAdicionaisRaw = {
  cCategCompra?: string;
};

type OmieItensInfoAdicRaw = {
  cCategoriaItem?: string;
};

type OmieItensAjustesRaw = {
  cCFOPEntrada?: string;
};

type OmieRecebimentoItemRaw = Omit<
  OmieRecebimentoItem,
  'nQtdeNfe' | 'cfopEntrada' | 'ncm' | 'categoriaItem'
> & {
  nQtdeNfe?: number;
  nQtdeNFe?: number;
  cNCM?: string;
  cCodigoNCM?: string;
};

type OmieRecebimentoLinhaRaw = {
  itensCabec?: OmieRecebimentoItemRaw;
  itensAjustes?: OmieItensAjustesRaw;
  itensInfoAdic?: OmieItensInfoAdicRaw;
};

export type OmieConsultarRecebimentoRaw = {
  cabec?: OmieCabecRaw;
  infoAdicionais?: OmieInfoAdicionaisRaw;
  itensCabec?: OmieRecebimentoItemRaw[];
  itensRecebimento?: OmieRecebimentoLinhaRaw[];
};

export type ConsultarRecebimentoNormalizado = {
  cabec?: OmieRecebimentoCabecEnriquecido;
  infoAdicionais?: OmieRecebimentoInfoAdicionais;
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

function normalizarInfoAdicionais(
  raw?: OmieInfoAdicionaisRaw,
): OmieRecebimentoInfoAdicionais | undefined {
  if (!raw) return undefined;
  const codigo = raw.cCategCompra?.trim();
  if (!codigo) return undefined;
  return { cCategCompra: codigo };
}

function normalizarItem(
  raw: OmieRecebimentoItemRaw,
  ajustes?: OmieItensAjustesRaw,
  infoAdic?: OmieItensInfoAdicRaw,
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
    categoriaItem: infoAdic?.cCategoriaItem?.trim() || null,
  };
}

function normalizarItensRecebimento(linhas: OmieRecebimentoLinhaRaw[]): OmieRecebimentoItem[] {
  return linhas
    .map((linha) => {
      if (!linha.itensCabec) return null;
      return normalizarItem(linha.itensCabec, linha.itensAjustes, linha.itensInfoAdic);
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
    infoAdicionais: normalizarInfoAdicionais(raw.infoAdicionais),
    itensCabec: itensDiretos.length > 0 ? itensDiretos : itensAninhados,
  };
}

export function extrairCodigoCategoriaCompra(input: {
  infoAdicionais?: OmieRecebimentoInfoAdicionais;
  item?: OmieRecebimentoItem;
}): string | null {
  return input.infoAdicionais?.cCategCompra ?? input.item?.categoriaItem ?? null;
}
