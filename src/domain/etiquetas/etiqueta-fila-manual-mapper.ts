import { loteFromDataFabricacaoEtiqueta } from '@/domain/embalagem/lote-from-data-fabricacao';
import type { EtiquetaGeradaRecord } from '@/data/etiquetas/EtiquetasGeradasRepository';
import type { EtiquetaFilaItem } from '@/domain/etiquetas/etiqueta-fila-types';
import { extractCalendarDate } from '@/lib/utils/date-utils';

const quantidadeVazia = { caixas: 0, pacotes: 0, unidades: 0, kg: 0 };

export function mapManualGeradaToFilaItem(
  gerada: EtiquetaGeradaRecord,
  produtoNome: string,
  tipoNome: string,
): EtiquetaFilaItem {
  const dataFabricacao =
    extractCalendarDate(gerada.dataFabricacao) || gerada.dataFabricacao;

  return {
    origem: 'manual',
    etiquetaGeradaId: gerada.id,
    pedidoEmbalagemId: gerada.id,
    lote: loteFromDataFabricacaoEtiqueta(dataFabricacao) ?? null,
    pedidoCreatedAt: gerada.geradoEm,
    produto: produtoNome,
    produtoId: gerada.produtoId,
    tipoEstoque: tipoNome,
    tipoEstoqueId: gerada.tipoEstoqueId,
    dataFabricacao,
    pedido: quantidadeVazia,
    produzido: quantidadeVazia,
    unidade: 'cx',
    geradoEm: gerada.geradoEm,
  };
}
