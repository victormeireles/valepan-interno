import { resolvePesoGramas, type ProdutoPesoInput } from '@/domain/assadeiras/produto-peso';
import {
  calcularQuantidadePorProdutoBrilho,
  formatarResumoCalculoBrilho,
} from '@/domain/receitas/receita-brilho-calculo';
import {
  calcularQuantidadePorProdutoMassa,
  formatarResumoCalculoMassa,
  type ReceitaMassaIngrediente,
} from '@/domain/receitas/receita-massa-calculo';
import {
  calcularQuantidadePorProdutoConfeito,
  formatarResumoCalculoConfeito,
} from '@/domain/receitas/receita-confeito-calculo';
import {
  receitaTipoUsaCalculoCoeficienteGramatura,
  receitaTipoUsaGramaturaConfeito,
  receitaTipoUsaGramaturaDireta,
  resolverMassaCruaGramas,
  resolverQuantidadePorGramatura,
  type ReceitaGramatura,
  type TipoReceita,
} from '@/domain/receitas/receita-gramatura-resolver';

export type ReceitaProdutoQuantidadeSugestao = {
  pesoGramas: number | null;
  quantidade: number | null;
  resumo: string | null;
  aviso: string | null;
};

type ResolverInput = {
  tipo: TipoReceita;
  ingredientes?: ReceitaMassaIngrediente[];
  gramaturas?: ReceitaGramatura[];
  produto: ProdutoPesoInput;
};

export function resolverQuantidadeReceitaParaProduto(
  input: ResolverInput,
): ReceitaProdutoQuantidadeSugestao {
  const pesoGramas = resolvePesoGramas({
    unit_weight: input.produto.unit_weight,
    nome: input.produto.nome,
  });

  if (input.tipo === 'massa') {
    if (!input.ingredientes?.length) {
      return { pesoGramas, quantidade: null, resumo: null, aviso: null };
    }
    if (!pesoGramas) {
      return {
        pesoGramas: null,
        quantidade: null,
        resumo: null,
        aviso: 'Gramatura do produto não encontrada. Informe o peso no ERP ou no nome (ex.: 65g).',
      };
    }
    const massaCruaGramas = resolverMassaCruaGramas(input.gramaturas ?? [], pesoGramas);
    if (massaCruaGramas == null) {
      return {
        pesoGramas,
        quantidade: null,
        resumo: null,
        aviso: `Massa crua não cadastrada para ${pesoGramas} g nesta receita. Adicione o par gramatura assada → massa crua.`,
      };
    }
    const resultado = calcularQuantidadePorProdutoMassa(input.ingredientes, massaCruaGramas);
    if (!resultado) {
      return {
        pesoGramas,
        quantidade: null,
        resumo: null,
        aviso: 'Não foi possível calcular: verifique se a receita tem ingredientes em kg, L ou g.',
      };
    }
    return {
      pesoGramas,
      quantidade: resultado.quantidade,
      resumo: formatarResumoCalculoMassa(resultado, massaCruaGramas),
      aviso: null,
    };
  }

  if (receitaTipoUsaCalculoCoeficienteGramatura(input.tipo)) {
    if (!input.ingredientes?.length || !input.gramaturas?.length) {
      return { pesoGramas, quantidade: null, resumo: null, aviso: null };
    }
    if (!pesoGramas) {
      return {
        pesoGramas: null,
        quantidade: null,
        resumo: null,
        aviso: receitaTipoUsaGramaturaConfeito(input.tipo)
          ? 'Gramatura do produto não encontrada para calcular o confeito.'
          : 'Gramatura do produto não encontrada para calcular o brilho.',
      };
    }

    if (receitaTipoUsaGramaturaConfeito(input.tipo)) {
      const resultado = calcularQuantidadePorProdutoConfeito(
        input.ingredientes,
        input.gramaturas,
        pesoGramas,
      );
      if (!resultado) {
        return {
          pesoGramas,
          quantidade: null,
          resumo: null,
          aviso: `Sem rendimento cadastrado para ${pesoGramas} g nesta receita de confeito.`,
        };
      }
      return {
        pesoGramas,
        quantidade: resultado.quantidade,
        resumo: formatarResumoCalculoConfeito(resultado, pesoGramas),
        aviso: null,
      };
    }

    const resultado = calcularQuantidadePorProdutoBrilho(
      input.ingredientes,
      input.gramaturas,
      pesoGramas,
    );
    if (!resultado) {
      return {
        pesoGramas,
        quantidade: null,
        resumo: null,
        aviso: `Sem rendimento cadastrado para ${pesoGramas} g nesta receita de brilho.`,
      };
    }
    return {
      pesoGramas,
      quantidade: resultado.quantidade,
      resumo: formatarResumoCalculoBrilho(resultado, pesoGramas),
      aviso: null,
    };
  }

  if (!receitaTipoUsaGramaturaDireta(input.tipo)) {
    return { pesoGramas, quantidade: null, resumo: null, aviso: null };
  }

  if (!input.gramaturas?.length) {
    return { pesoGramas, quantidade: null, resumo: null, aviso: null };
  }

  if (!pesoGramas) {
    return {
      pesoGramas: null,
      quantidade: null,
      resumo: null,
      aviso: 'Gramatura do produto não encontrada para pré-preencher a quantidade.',
    };
  }

  const quantidade = resolverQuantidadePorGramatura(input.gramaturas, pesoGramas);
  if (quantidade == null) {
    return {
      pesoGramas,
      quantidade: null,
      resumo: null,
      aviso: `Sem quantidade cadastrada para ${pesoGramas} g nesta receita.`,
    };
  }

  return {
    pesoGramas,
    quantidade,
    resumo: `Gramatura ${pesoGramas} g → ${quantidade.toLocaleString('pt-BR')} unidades/receita`,
    aviso: null,
  };
}
