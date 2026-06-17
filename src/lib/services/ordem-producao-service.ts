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
    const resolved = await this.resolveAssadeiraForProduto(produtoId);
    if (!resolved) {
      throw new EstoqueResolverError(`Produto sem assadeira: ${produtoId}`);
    }
    return resolved;
  }

  async resolveAssadeiraForProduto(
    produtoId: string,
    assadeiraNome?: string | null,
  ): Promise<{
    assadeiraId: string;
    unidadesPorAssadeiraEfetiva: number;
    boxUnits: number | null;
  } | null> {
    const list = await assadeiraResolver.resolveForProduto(produtoId);
    if (list.length === 0) return null;

    const supabase = supabaseClientFactory.createServiceRoleClient();
    const { data: produto } = await supabase
      .from('produtos')
      .select('box_units')
      .eq('id', produtoId)
      .maybeSingle();
    const boxUnits = produto?.box_units ?? null;

    const nome = assadeiraNome?.trim();
    if (!nome) {
      const resolved = list[0];
      return {
        assadeiraId: resolved.assadeira_id,
        unidadesPorAssadeiraEfetiva: resolved.unidades_efetivas,
        boxUnits,
      };
    }

    const normalized = nome.toLocaleLowerCase('pt-BR');
    const match = list.find(
      (v) => v.assadeira_nome.toLocaleLowerCase('pt-BR') === normalized,
    );
    if (!match) {
      throw new EstoqueResolverError(
        `Assadeira "${nome}" não encontrada para este produto`,
      );
    }

    return {
      assadeiraId: match.assadeira_id,
      unidadesPorAssadeiraEfetiva: match.unidades_efetivas,
      boxUnits,
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
