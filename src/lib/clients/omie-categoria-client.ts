const OMIE_CATEGORIA_URL = 'https://app.omie.com.br/api/v1/geral/categorias/';

type OmieFaultResponse = {
  faultstring?: string;
};

type OmieCategoriaCadastro = {
  codigo?: string;
  descricao?: string;
};

type OmieListarCategoriasResponse = {
  pagina?: number;
  total_de_paginas?: number;
  categoria_cadastro?: OmieCategoriaCadastro[];
};

export class OmieCategoriaClient {
  async listarTodasCategorias(params: {
    appKey: string;
    appSecret: string;
  }): Promise<OmieCategoriaCadastro[]> {
    const categorias: OmieCategoriaCadastro[] = [];
    let pagina = 1;
    let totalPaginas = 1;

    while (pagina <= totalPaginas) {
      const data = await this.postOmie<OmieListarCategoriasResponse>({
        call: 'ListarCategorias',
        appKey: params.appKey,
        appSecret: params.appSecret,
        param: [{ pagina, registros_por_pagina: 200 }],
      });

      categorias.push(...(data.categoria_cadastro ?? []));
      totalPaginas = data.total_de_paginas ?? pagina;
      pagina += 1;
    }

    return categorias;
  }

  async consultarCategoria(params: {
    appKey: string;
    appSecret: string;
    codigo: string;
  }): Promise<OmieCategoriaCadastro | null> {
    const data = await this.postOmie<OmieCategoriaCadastro>({
      call: 'ConsultarCategoria',
      appKey: params.appKey,
      appSecret: params.appSecret,
      param: [{ codigo: params.codigo }],
    });

    if (!data.codigo?.trim()) return null;
    return data;
  }

  private async postOmie<T>(input: {
    call: string;
    appKey: string;
    appSecret: string;
    param: unknown[];
  }): Promise<T> {
    const response = await fetch(OMIE_CATEGORIA_URL, {
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

export const omieCategoriaClient = new OmieCategoriaClient();
