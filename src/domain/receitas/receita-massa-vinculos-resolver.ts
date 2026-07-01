import { resolvePesoGramas } from '@/domain/assadeiras/produto-peso';
import {
  calcularQuantidadePorProdutoMassa,
  type ReceitaMassaIngrediente,
} from '@/domain/receitas/receita-massa-calculo';
import {
  resolverMassaCruaGramas,
  type ReceitaGramatura,
} from '@/domain/receitas/receita-gramatura-resolver';

export type VinculoMassaParaSync = {
  vinculoId: string;
  produtoNome: string;
  unit_weight: number | null;
};

export function resolverAtualizacoesVinculoMassa(
  ingredientes: ReceitaMassaIngrediente[],
  vinculos: VinculoMassaParaSync[],
  gramaturas: ReceitaGramatura[] = [],
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

    const massaCruaGramas = resolverMassaCruaGramas(gramaturas, pesoGramas);
    if (massaCruaGramas == null) {
      ignorados.push({
        produtoNome: vinculo.produtoNome,
        motivo: `massa crua não cadastrada para ${pesoGramas} g`,
      });
      continue;
    }

    const resultado = calcularQuantidadePorProdutoMassa(ingredientes, massaCruaGramas);
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
