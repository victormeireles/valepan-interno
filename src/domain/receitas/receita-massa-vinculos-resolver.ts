import { resolvePesoGramas } from '@/domain/assadeiras/produto-peso';
import {
  calcularQuantidadePorProdutoMassa,
  type ReceitaMassaIngrediente,
} from '@/domain/receitas/receita-massa-calculo';

export type VinculoMassaParaSync = {
  vinculoId: string;
  produtoNome: string;
  unit_weight: number | null;
};

export function resolverAtualizacoesVinculoMassa(
  ingredientes: ReceitaMassaIngrediente[],
  vinculos: VinculoMassaParaSync[],
): {
  atualizacoes: Array<{ vinculoId: string; quantidade: number }>;
  ignorados: Array<{ produtoNome: string; motivo: string }>;
} {
  const atualizacoes: Array<{ vinculoId: string; quantidade: number }> = [];
  const ignorados: Array<{ produtoNome: string; motivo: string }> = [];

  for (const vinculo of vinculos) {
    const pesoGramas = resolvePesoGramas({
      unit_weight: vinculo.unit_weight,
      nome: vinculo.produtoNome,
    });

    if (!pesoGramas) {
      ignorados.push({
        produtoNome: vinculo.produtoNome,
        motivo: 'gramatura do produto não encontrada',
      });
      continue;
    }

    const resultado = calcularQuantidadePorProdutoMassa(ingredientes, pesoGramas);
    if (!resultado) {
      ignorados.push({
        produtoNome: vinculo.produtoNome,
        motivo: 'não foi possível calcular com os ingredientes atuais',
      });
      continue;
    }

    atualizacoes.push({
      vinculoId: vinculo.vinculoId,
      quantidade: resultado.quantidade,
    });
  }

  return { atualizacoes, ignorados };
}
