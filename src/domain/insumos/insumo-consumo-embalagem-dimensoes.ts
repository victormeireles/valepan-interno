import type { InsumoReceitaTipoContexto } from '@/domain/insumos/insumo-consumo-producao-types';
import type { Quantidade } from '@/domain/types/inventario';

export type EmbalagemDimensoesProduzidas = {
  unidades: number | null;
  pacotes: number | null;
  avisos: string[];
};

function qppDoTipo(
  receitas: InsumoReceitaTipoContexto[],
  tipo: 'embalagem' | 'caixa',
): number | null {
  const receita = receitas.find((r) => r.tipo === tipo);
  if (!receita || !receita.quantidadePorProduto || receita.quantidadePorProduto <= 0) {
    return null;
  }
  return receita.quantidadePorProduto;
}

/**
 * Deriva unidades (pães) e pacotes produzidos a partir da unidade principal do
 * lote de embalagem, usando pães/pacote (receita embalagem) e pacotes/caixa
 * (receita caixa). Retorna avisos quando não é possível converter alguma dimensão.
 */
export function derivarDimensoesEmbalagem(
  quantidade: Quantidade,
  receitas: InsumoReceitaTipoContexto[],
): EmbalagemDimensoesProduzidas {
  const paesPorPacote = qppDoTipo(receitas, 'embalagem');
  const pacotesPorCaixa = qppDoTipo(receitas, 'caixa');
  const avisos: string[] = [];

  let unidades: number | null = null;
  let pacotes: number | null = null;

  if (quantidade.caixas > 0) {
    if (pacotesPorCaixa) {
      pacotes = quantidade.caixas * pacotesPorCaixa;
      unidades = paesPorPacote ? pacotes * paesPorPacote : null;
    } else {
      avisos.push('Lote em caixas sem receita de caixa (pacotes/caixa): estoque não derivado');
    }
  } else if (quantidade.pacotes > 0) {
    pacotes = quantidade.pacotes;
    unidades = paesPorPacote ? pacotes * paesPorPacote : null;
  } else if (quantidade.unidades > 0) {
    unidades = quantidade.unidades;
    pacotes = paesPorPacote ? unidades / paesPorPacote : null;
  } else if (quantidade.kg > 0) {
    avisos.push('Lote medido em kg: não é possível derivar unidades/pacotes para o estoque');
  }

  if (unidades == null && pacotes == null && avisos.length === 0) {
    avisos.push('Quantidade do lote sem dimensão válida para cálculo de consumo');
  }

  return { unidades, pacotes, avisos };
}
