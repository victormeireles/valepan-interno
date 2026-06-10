import { ordemProducaoRepository } from '@/data/producao/OrdemProducaoRepository';
import { pedidoKeyToString } from '@/domain/embalagem/pedido-key';
import { resolveUnidadesPorAssadeiraEfetiva } from '@/domain/producao/assadeira-factor';
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

  async resolveAssadeiraDefault(produtoId: string): Promise<{
    assadeiraId: string;
    unidadesPorAssadeiraEfetiva: number;
    boxUnits: number | null;
  }> {
    const supabase = supabaseClientFactory.createServiceRoleClient();
    const { data: link, error } = await supabase
      .from('produto_assadeiras')
      .select('assadeira_id, unidades_por_assadeira, produtos(box_units), assadeiras(unidades_por_assadeira)')
      .eq('produto_id', produtoId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error || !link) throw new EstoqueResolverError(`Produto sem assadeira: ${produtoId}`);
    const row = link as unknown as {
      assadeira_id: string;
      unidades_por_assadeira: number | null;
      produtos: { box_units: number | null } | null;
      assadeiras: { unidades_por_assadeira: number | null } | null;
    };
    const fator = resolveUnidadesPorAssadeiraEfetiva({
      produto: row.unidades_por_assadeira,
      assadeira: row.assadeiras?.unidades_por_assadeira,
    });
    if (!fator) throw new EstoqueResolverError(`Fator assadeira inválido: ${produtoId}`);
    return {
      assadeiraId: row.assadeira_id,
      unidadesPorAssadeiraEfetiva: fator,
      boxUnits: row.produtos?.box_units ?? null,
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
