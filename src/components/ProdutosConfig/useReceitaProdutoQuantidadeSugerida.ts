import { useMemo } from 'react';
import {
  resolverQuantidadeReceitaParaProduto,
  type ReceitaProdutoQuantidadeSugestao,
} from '@/domain/receitas/receita-produto-quantidade-resolver';
import type { ReceitaGramatura } from '@/domain/receitas/receita-gramatura-resolver';
import type { TipoReceita } from '@/components/ProdutosConfig/produto-receita-tipo-options';

type ProdutoPesoInput = {
  nome: string;
  unit_weight: number | null;
};

type ReceitaCatalogoRef = {
  tipo: TipoReceita;
  ingredientes?: Array<{ quantidade: number; unidade: string | null }>;
  gramaturas?: ReceitaGramatura[];
};

export function useReceitaProdutoQuantidadeSugerida(
  receita: ReceitaCatalogoRef | undefined,
  produto: ProdutoPesoInput,
): ReceitaProdutoQuantidadeSugestao {
  return useMemo(() => {
    if (!receita) {
      return { pesoGramas: null, quantidade: null, resumo: null, aviso: null };
    }

    return resolverQuantidadeReceitaParaProduto({
      tipo: receita.tipo,
      ingredientes: receita.ingredientes,
      gramaturas: receita.gramaturas,
      produto,
    });
  }, [receita, produto]);
}
