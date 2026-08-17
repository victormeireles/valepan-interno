import type {
  ProdutoCustoCenarioInput,
  ProdutoCustoIngrediente,
  ProdutoCustoTipoReceita,
  ProdutoCustoVinculo,
} from './produto-custo-unitario-types';

export class ProdutoCustoSimuladorCenario {
  selecaoInicial(
    vinculos: ProdutoCustoVinculo[],
  ): ProdutoCustoCenarioInput['selecao'] {
    const selecao: ProdutoCustoCenarioInput['selecao'] = {};
    for (const vinculo of vinculos) {
      selecao[vinculo.tipo] = {
        receitaId: vinculo.receitaId,
        quantidade: vinculo.quantidadePorProduto,
      };
    }
    return selecao;
  }

  montarDepois(input: ProdutoCustoCenarioInput): ProdutoCustoVinculo[] {
    const depois: ProdutoCustoVinculo[] = [];
    const tipos = Object.keys(input.selecao) as ProdutoCustoTipoReceita[];

    for (const tipo of tipos) {
      const escolha = input.selecao[tipo];
      if (!escolha?.receitaId) continue;
      const receita = input.catalogo.find((item) => item.id === escolha.receitaId);
      if (!receita) continue;

      depois.push({
        tipo: receita.tipo,
        receitaId: receita.id,
        receitaNome: receita.nome,
        quantidadePorProduto: escolha.quantidade ?? 0,
        ingredientes: receita.ingredientes,
      });
    }

    return depois;
  }

  coletarInsumos(...grupos: ProdutoCustoVinculo[][]): ProdutoCustoIngrediente[] {
    const porId = new Map<string, ProdutoCustoIngrediente>();
    for (const grupo of grupos) {
      for (const vinculo of grupo) {
        for (const ingrediente of vinculo.ingredientes) {
          if (!porId.has(ingrediente.insumoId)) {
            porId.set(ingrediente.insumoId, ingrediente);
          }
        }
      }
    }
    return [...porId.values()].sort((a, b) =>
      a.insumoNome.localeCompare(b.insumoNome, 'pt-BR'),
    );
  }
}

export const produtoCustoSimuladorCenario = new ProdutoCustoSimuladorCenario();
