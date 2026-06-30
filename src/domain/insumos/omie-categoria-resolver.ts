import {
  omieCategoriaClient,
  type OmieCategoriaClient,
} from '@/lib/clients/omie-categoria-client';

type EmpresaCredenciais = {
  empresaId: string;
  appKey: string;
  appSecret: string;
};

export class OmieCategoriaResolver {
  private readonly mapaPorEmpresa = new Map<string, Map<string, string>>();

  constructor(private readonly client: OmieCategoriaClient = omieCategoriaClient) {}

  async resolverDescricao(input: {
    empresa: EmpresaCredenciais;
    codigo: string | null | undefined;
  }): Promise<{ codigo: string | null; descricao: string | null }> {
    const codigo = input.codigo?.trim() || null;
    if (!codigo) {
      return { codigo: null, descricao: null };
    }

    const mapa = await this.getMapaEmpresa(input.empresa);
    const descricaoCache = mapa.get(codigo);
    if (descricaoCache) {
      return { codigo, descricao: descricaoCache };
    }

    const consulta = await this.client.consultarCategoria({
      appKey: input.empresa.appKey,
      appSecret: input.empresa.appSecret,
      codigo,
    });

    const descricao = consulta?.descricao?.trim() || null;
    if (descricao) {
      mapa.set(codigo, descricao);
    }

    return { codigo, descricao };
  }

  private async getMapaEmpresa(empresa: EmpresaCredenciais): Promise<Map<string, string>> {
    const cached = this.mapaPorEmpresa.get(empresa.empresaId);
    if (cached) return cached;

    const categorias = await this.client.listarTodasCategorias({
      appKey: empresa.appKey,
      appSecret: empresa.appSecret,
    });

    const mapa = new Map<string, string>();
    for (const categoria of categorias) {
      const codigo = categoria.codigo?.trim();
      const descricao = categoria.descricao?.trim();
      if (codigo && descricao) {
        mapa.set(codigo, descricao);
      }
    }

    this.mapaPorEmpresa.set(empresa.empresaId, mapa);
    return mapa;
  }
}

export const omieCategoriaResolver = new OmieCategoriaResolver();
