import type {
  InsumoConsumoCalculado,
  InsumoReceitaTipoContexto,
} from '@/domain/insumos/insumo-consumo-producao-types';
import type { TipoReceita } from '@/domain/receitas/receita-gramatura-resolver';

const CASAS = 6;

function arredondar(value: number): number {
  const fator = 10 ** CASAS;
  return Math.round(value * fator) / fator;
}

/**
 * Dimensão produzida usada como base do consumo de cada tipo de receita.
 * Regra: `quantidade_por_produto` = quantos itens da dimensão 1 receita rende.
 *  - massa/brilho/confeito/antimofo/embalagem: dimensão = pães (unidades)
 *    (embalagem: qpp = pães/pacote, então unidades ÷ qpp = nº de pacotes = nº de receitas)
 *  - caixa: dimensão = pacotes (qpp = pacotes/caixa)
 */
function dimensaoDoTipo(tipo: TipoReceita): 'unidades' | 'pacotes' {
  return tipo === 'caixa' ? 'pacotes' : 'unidades';
}

export type InsumoConsumoMultiInput = {
  unidadesProduzidas: number;
  pacotesProduzidos: number | null;
  receitas: InsumoReceitaTipoContexto[];
};

export type InsumoConsumoMultiResultado = {
  consumos: InsumoConsumoCalculado[];
  avisos: string[];
};

/**
 * Agrega o consumo de várias receitas (uma etapa) somando por insumo.
 * Ignora (com aviso) receitas cuja dimensão base é indisponível ou inválida,
 * sem interromper o cálculo das demais.
 */
export function calcularConsumoMultiReceitas(
  input: InsumoConsumoMultiInput,
): InsumoConsumoMultiResultado {
  const acumulado = new Map<string, number>();
  const avisos: string[] = [];

  for (const receita of input.receitas) {
    const base =
      dimensaoDoTipo(receita.tipo) === 'pacotes'
        ? input.pacotesProduzidos
        : input.unidadesProduzidas;

    if (base == null || base <= 0) {
      avisos.push(
        `Receita ${receita.tipo} ignorada: quantidade base indisponível para o cálculo`,
      );
      continue;
    }

    if (!receita.quantidadePorProduto || receita.quantidadePorProduto <= 0) {
      avisos.push(`Receita ${receita.tipo} ignorada: sem quantidade por produto válida`);
      continue;
    }

    const ingredientesValidos = receita.ingredientes.filter(
      (item) => item.insumoId && item.quantidadePadrao > 0,
    );
    if (ingredientesValidos.length === 0) {
      avisos.push(`Receita ${receita.tipo} ignorada: sem ingredientes vinculados`);
      continue;
    }

    const receitasConsumidas = base / receita.quantidadePorProduto;
    for (const item of ingredientesValidos) {
      const quantidade = receitasConsumidas * item.quantidadePadrao;
      acumulado.set(item.insumoId, (acumulado.get(item.insumoId) ?? 0) + quantidade);
    }
  }

  const consumos: InsumoConsumoCalculado[] = [];
  for (const [insumoId, quantidade] of acumulado) {
    const arredondado = arredondar(quantidade);
    if (arredondado > 0) {
      consumos.push({ insumoId, quantidade: arredondado });
    }
  }

  return { consumos, avisos };
}
