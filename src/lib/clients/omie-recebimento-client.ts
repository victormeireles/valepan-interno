import type {
  OmieListarRecebimentosFiltro,
  OmieListarRecebimentosResponse,
  OmieRecebimentoCabecalhoResumo,
} from '@/domain/types/omie-recebimento-list';
import {
  normalizarConsultarRecebimento,
  type ConsultarRecebimentoNormalizado,
  type OmieConsultarRecebimentoRaw,
} from '@/lib/clients/omie-recebimento-normalizer';

const OMIE_RECEBIMENTO_URL =
  'https://app.omie.com.br/api/v1/produtos/recebimentonfe/';

type OmieFaultResponse = {
  faultstring?: string;
};

export type ConsultarRecebimentoResponse = ConsultarRecebimentoNormalizado;

export class OmieRecebimentoClient {
  async consultarRecebimento(params: {
    appKey: string;
    appSecret: string;
    nIdReceb: number;
  }): Promise<ConsultarRecebimentoResponse> {
    const data = await this.postOmie<OmieConsultarRecebimentoRaw>({
      call: 'ConsultarRecebimento',
      appKey: params.appKey,
      appSecret: params.appSecret,
      param: [{ nIdReceb: params.nIdReceb, cChaveNfe: '' }],
    });

    return normalizarConsultarRecebimento(data);
  }

  async listarRecebimentos(params: {
    appKey: string;
    appSecret: string;
    filtro: OmieListarRecebimentosFiltro;
  }): Promise<OmieListarRecebimentosResponse> {
    try {
      return await this.postOmie<OmieListarRecebimentosResponse>({
        call: 'ListarRecebimentos',
        appKey: params.appKey,
        appSecret: params.appSecret,
        param: [params.filtro],
      });
    } catch (error) {
      if (this.isListagemVazia(error)) {
        return {
          nPagina: params.filtro.nPagina,
          nTotalPaginas: 0,
          nRegistros: 0,
          nTotalRegistros: 0,
          recebimentos: [],
        };
      }
      throw error;
    }
  }

  private isListagemVazia(error: unknown): boolean {
    return (
      error instanceof Error &&
      error.message.toLowerCase().includes('não existem registros')
    );
  }

  static extrairCabecalho(
    recebimento: { cabec?: OmieRecebimentoCabecalhoResumo } & OmieRecebimentoCabecalhoResumo,
  ): OmieRecebimentoCabecalhoResumo | null {
    const cabec = recebimento.cabec ?? recebimento;
    if (!cabec.nIdReceb) {
      return null;
    }
    return cabec;
  }

  private async postOmie<T>(input: {
    call: string;
    appKey: string;
    appSecret: string;
    param: unknown[];
  }): Promise<T> {
    const response = await fetch(OMIE_RECEBIMENTO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        call: input.call,
        app_key: input.appKey,
        app_secret: input.appSecret,
        param: input.param,
      }),
    });

    const data = (await response.json()) as T & OmieFaultResponse;

    if (data.faultstring) {
      throw new Error(data.faultstring);
    }

    if (!response.ok) {
      throw new Error(`Omie HTTP ${response.status}`);
    }

    return data;
  }
}

export const omieRecebimentoClient = new OmieRecebimentoClient();
