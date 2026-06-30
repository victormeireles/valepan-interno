import type { OmieRecebimentoInfoAdicionais } from '@/domain/types/omie-recebimento-enriquecido';
import type { OmieRecebimentoItem } from '@/domain/types/insumo-estoque';
import {
  omieCategoriaResolver,
  type OmieCategoriaResolver,
} from '@/domain/insumos/omie-categoria-resolver';
import { extrairCodigoCategoriaCompra } from '@/lib/clients/omie-recebimento-normalizer';

type EmpresaCredenciais = {
  empresaId: string;
  appKey: string;
  appSecret: string;
};

export type CategoriaCompraResolvida = {
  codigo: string | null;
  descricao: string | null;
};

export class InsumoRecebimentoCategoriaService {
  constructor(private readonly resolver: OmieCategoriaResolver = omieCategoriaResolver) {}

  async resolverCategoriaRecebimento(input: {
    empresa: EmpresaCredenciais;
    infoAdicionais?: OmieRecebimentoInfoAdicionais;
  }): Promise<CategoriaCompraResolvida> {
    return this.resolver.resolverDescricao({
      empresa: input.empresa,
      codigo: input.infoAdicionais?.cCategCompra ?? null,
    });
  }

  async resolverCategoriaItem(input: {
    empresa: EmpresaCredenciais;
    infoAdicionais?: OmieRecebimentoInfoAdicionais;
    item: OmieRecebimentoItem;
    categoriaRecebimento: CategoriaCompraResolvida;
  }): Promise<CategoriaCompraResolvida> {
    if (input.categoriaRecebimento.codigo) {
      return input.categoriaRecebimento;
    }

    const codigoItem = extrairCodigoCategoriaCompra({
      infoAdicionais: input.infoAdicionais,
      item: input.item,
    });

    return this.resolver.resolverDescricao({
      empresa: input.empresa,
      codigo: codigoItem,
    });
  }
}

export const insumoRecebimentoCategoriaService = new InsumoRecebimentoCategoriaService();
