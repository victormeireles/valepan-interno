'use server';

import { insumoMovimentoNfConsultaRepository } from '@/data/insumos/InsumoMovimentoNfConsultaRepository';
import { insumoPendenciaRepository } from '@/data/insumos/InsumoPendenciaRepository';
import type { InsumoNfDetalhe } from '@/domain/insumos/insumo-nf-detalhe';
import {
  INSUMO_NF_CONSULTA_LIMITE,
  toInsumoNfIsoRange,
} from '@/domain/insumos/insumo-nf-periodo';
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
  de: string;
  ate: string;
};

export async function getInsumoNotasPorProdutoOmie(
  input: InsumoNotasPorProdutoOmieInput,
): Promise<InsumoNfDetalhe[]> {
  await requireInternoModulo('interno_insumos', 'ler');

  const { inicioIso, fimIso } = toInsumoNfIsoRange(input.de, input.ate);

  const [pendencias, movimentos] = await Promise.all([
    insumoPendenciaRepository.listPorProdutoOmie({
      empresaId: input.empresaId,
      omieIdProduto: input.omieIdProduto,
      statuses: input.statuses,
      dataEmissaoDe: input.de,
      dataEmissaoAte: input.ate,
      limit: INSUMO_NF_CONSULTA_LIMITE,
    }),
    input.insumoId
      ? insumoMovimentoNfConsultaRepository.listEntradasPorEmpresaInsumo(
          input.empresaId,
          input.insumoId,
          {
            createdAtDe: inicioIso,
            createdAtAte: fimIso,
            limit: INSUMO_NF_CONSULTA_LIMITE,
          },
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
