import { ordemProducaoRepository } from '@/data/producao/OrdemProducaoRepository';
import { pedidoKeyToString } from '@/domain/embalagem/pedido-key';
import { assadeiraResolver } from '@/domain/assadeiras/assadeira-resolver';
import type { OrdemProducaoKey } from '@/domain/types/ordem-producao';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import {
  estoqueResolverService,
  EstoqueResolverError,
} from '@/lib/services/estoque-resolver-service';

export { EstoqueResolverError };

export class OrdemProducaoService {
  async resolveIds(
    cliente: string,
    produto: string,
  ): Promise<{ tipoEstoqueId: string; produtoId: string }> {
    const tipoEstoqueId = await estoqueResolverService.resolveTipoEstoqueFromCliente(
      cliente,
    );
    const produtoId = await estoqueResolverService.resolveProdutoId(produto);
    return { tipoEstoqueId, produtoId };
  }

  async hasAssadeiraForProduto(produtoId: string): Promise<boolean> {
    const resolved = await assadeiraResolver.resolveDefaultForProduto(produtoId);
    return resolved != null;
  }

  async resolveBoxUnitsForProduto(produtoId: string): Promise<number | null> {
    const supabase = supabaseClientFactory.createServiceRoleClient();
    const { data: produto } = await supabase
      .from('produtos')
      .select('box_units')
      .eq('id', produtoId)
      .maybeSingle();
    return produto?.box_units ?? null;
  }

  async resolveAssadeiraDefault(produtoId: string): Promise<{
    assadeiraId: string;
    unidadesPorAssadeiraEfetiva: number;
    boxUnits: number | null;
  }> {
    const resolved = await assadeiraResolver.resolveDefaultForProduto(produtoId);
    if (!resolved) {
      throw new EstoqueResolverError(`Produto sem assadeira: ${produtoId}`);
    }

    const supabase = supabaseClientFactory.createServiceRoleClient();
    const { data: produto } = await supabase
      .from('produtos')
      .select('box_units')
      .eq('id', produtoId)
      .maybeSingle();

    return {
      assadeiraId: resolved.assadeira_id,
      unidadesPorAssadeiraEfetiva: resolved.unidades_efetivas,
      boxUnits: produto?.box_units ?? null,
    };
  }

  async validatePayloadItems(
    cliente: string,
    produtos: string[],
  ): Promise<void> {
    for (const produto of produtos) {
      await this.resolveIds(cliente, produto);
    }
  }

  async resolvePedidoEmbalagemId(
    key: OrdemProducaoKey,
  ): Promise<string | null> {
    const found = await ordemProducaoRepository.findByKey(key);
    if (!found) {
      console.warn(
        `[resolvePedidoEmbalagemId] pedido não encontrado: ${pedidoKeyToString(key)}`,
      );
      return null;
    }

    return found.id;
  }
}

export const ordemProducaoService = new OrdemProducaoService();
