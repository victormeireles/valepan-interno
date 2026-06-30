import type {
  InsumoConsumoCalculoInput,
  InsumoConsumoCalculoResultado,
  InsumoConsumoCalculado,
} from '@/domain/insumos/insumo-consumo-producao-types';

const CASAS = 6;

function arredondar(value: number): number {
  const fator = 10 ** CASAS;
  return Math.round(value * fator) / fator;
}

function resolverUnidadesProduzidas(input: InsumoConsumoCalculoInput): number | null {
  if (input.modo === 'assadeiras') {
    if (!input.contexto.unidadesPorAssadeira || input.contexto.unidadesPorAssadeira <= 0) {
      return null;
    }
    if (input.lote.assadeiras <= 0) return null;
    return input.lote.assadeiras * input.contexto.unidadesPorAssadeira;
  }
  if (input.lote.unidades <= 0) return null;
  return input.lote.unidades;
}

export function calcularConsumoInsumosProducao(
  input: InsumoConsumoCalculoInput,
): InsumoConsumoCalculoResultado {
  const { quantidadePorProduto, ingredientes } = input.contexto;

  if (!quantidadePorProduto || quantidadePorProduto <= 0) {
    return { ok: false, motivo: 'Receita de massa sem quantidade por produto válida' };
  }
  if (!ingredientes.length) {
    return { ok: false, motivo: 'Receita de massa sem ingredientes vinculados' };
  }

  const unidadesProduzidas = resolverUnidadesProduzidas(input);
  if (unidadesProduzidas == null || unidadesProduzidas <= 0) {
    return { ok: false, motivo: 'Quantidade produzida inválida para cálculo de consumo' };
  }

  const receitasConsumidas = unidadesProduzidas / quantidadePorProduto;
  const consumos: InsumoConsumoCalculado[] = ingredientes
    .filter((item) => item.insumoId && item.quantidadePadrao > 0)
    .map((item) => ({
      insumoId: item.insumoId,
      quantidade: arredondar(receitasConsumidas * item.quantidadePadrao),
    }))
    .filter((item) => item.quantidade > 0);

  if (consumos.length === 0) {
    return { ok: false, motivo: 'Nenhum insumo com consumo calculável' };
  }

  return { ok: true, consumos };
}
