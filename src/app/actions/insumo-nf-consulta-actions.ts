'use server';

import { insumoMovimentoNfConsultaRepository } from '@/data/insumos/InsumoMovimentoNfConsultaRepository';
import { insumoPendenciaRepository } from '@/data/insumos/InsumoPendenciaRepository';
import type { InsumoNfDetalhe } from '@/domain/insumos/insumo-nf-detalhe';
import type { InsumoPendenciaStatus } from '@/domain/types/insumo-estoque';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import { insumoNfConsultaManager } from '@/lib/services/insumo-nf-consulta-manager';

type InsumoNotasPorProdutoOmieInput = {
  empresaId: string;
  omieIdProduto: number;
  statuses: InsumoPendenciaStatus[];
  insumoId: string | null;
  fatorConversao: number;
  unidadeEstoque: string | null;
  unidadeNfVinculo: string | null;
  insumoNome: string | null;
};

export async function getInsumoNotasPorProdutoOmie(
  input: InsumoNotasPorProdutoOmieInput,
): Promise<InsumoNfDetalhe[]> {
  await requireInternoModulo('interno_insumos', 'ler');

  const [pendencias, movimentos] = await Promise.all([
    insumoPendenciaRepository.listPorProdutoOmie(input),
    input.insumoId
      ? insumoMovimentoNfConsultaRepository.listEntradasPorEmpresaInsumo(
          input.empresaId,
          input.insumoId,
        )
      : Promise.resolve([]),
  ]);

  return insumoNfConsultaManager.unir(pendencias, movimentos, {
    fatorConversao: input.fatorConversao,
    unidadeEstoque: input.unidadeEstoque,
    unidadeNfVinculo: input.unidadeNfVinculo,
    insumoNome: input.insumoNome,
  });
}
