import type { OmieRecebimentoItem } from '@/domain/types/insumo-estoque';

const OMIE_RECEBIMENTO_URL =
  'https://app.omie.com.br/api/v1/produtos/recebimentonfe/';

type ConsultarRecebimentoResponse = {
  cabec?: { cNumeroNF?: string; dDataEmissao?: string };
  itensCabec?: OmieRecebimentoItem[];
};

export class OmieRecebimentoClient {
  async consultarRecebimento(params: {
    appKey: string;
    appSecret: string;
    nIdReceb: number;
  }): Promise<ConsultarRecebimentoResponse> {
    const body = {
      call: 'ConsultarRecebimento',
      app_key: params.appKey,
      app_secret: params.appSecret,
      param: [{ nIdReceb: params.nIdReceb, cChaveNfe: '' }],
    };

    const response = await fetch(OMIE_RECEBIMENTO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Omie HTTP ${response.status}`);
    }

    const data = (await response.json()) as ConsultarRecebimentoResponse & {
      faultstring?: string;
    };

    if (data.faultstring) {
      throw new Error(data.faultstring);
    }

    return data;
  }
}

export const omieRecebimentoClient = new OmieRecebimentoClient();
