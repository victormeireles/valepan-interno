import { somarLotesEtapa } from '@/domain/producao-etapa/etapa-quantidade';
import type { AssadeiraMetaContext } from '@/domain/producao-etapa/etapa-meta-referencia-resolver';
import type { FermentacaoLoteRecord } from '@/domain/types/fermentacao-lote';
import type { PedidoEmbalagemRecord } from '@/domain/types/pedido-embalagem';
import { pedidoEmbalagemService } from '@/lib/services/pedido-embalagem-service';

export type EtapasProduzidoLt = {
  fermentacao: number;
  forno: number;
};

export function somarAssadeirasLotes(lotes: FermentacaoLoteRecord[]): number {
  return somarLotesEtapa(
    lotes.map((lote) => ({
      assadeiras: lote.assadeiras,
      unidades: lote.unidades,
    })),
  ).assadeiras;
}

export function mapEtapasProduzidoPorOrdem(
  ordemIds: string[],
  fermentacaoLotes: Map<string, FermentacaoLoteRecord[]>,
  fornoLotes: Map<string, FermentacaoLoteRecord[]>,
): Map<string, EtapasProduzidoLt> {
  const map = new Map<string, EtapasProduzidoLt>();

  for (const ordemId of ordemIds) {
    map.set(ordemId, {
      fermentacao: somarAssadeirasLotes(fermentacaoLotes.get(ordemId) ?? []),
      forno: somarAssadeirasLotes(fornoLotes.get(ordemId) ?? []),
    });
  }

  return map;
}

export async function loadAssadeiraCtxByProdutoId(
  produtoIds: string[],
): Promise<Map<string, AssadeiraMetaContext>> {
  const unique = [...new Set(produtoIds)];
  const entries = await Promise.all(
    unique.map(async (produtoId) => {
      try {
        const assadeira = await pedidoEmbalagemService.resolveAssadeiraForProduto(produtoId);
        if (!assadeira) {
          return [produtoId, null] as const;
        }
        const ctx: AssadeiraMetaContext = {
          unidadesPorAssadeira: assadeira.unidadesPorAssadeiraEfetiva,
          boxUnits: assadeira.boxUnits,
        };
        return [produtoId, ctx] as const;
      } catch {
        return [produtoId, null] as const;
      }
    }),
  );

  const map = new Map<string, AssadeiraMetaContext>();
  for (const [produtoId, ctx] of entries) {
    if (ctx) map.set(produtoId, ctx);
  }
  return map;
}

export function resolveEtapasLtForPedido(
  pedido: PedidoEmbalagemRecord,
  etapasByOrdem: Map<string, EtapasProduzidoLt>,
): EtapasProduzidoLt {
  return etapasByOrdem.get(pedido.id) ?? { fermentacao: 0, forno: 0 };
}
