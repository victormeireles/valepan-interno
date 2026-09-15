import type {
  InsumoNfConsultaContexto,
  InsumoNfDetalhe,
  InsumoNfMovimentoEntrada,
} from '@/domain/insumos/insumo-nf-detalhe';
import type { InsumoPendenciaComEmpresa } from '@/domain/types/insumo-estoque-db';

export class InsumoNfConsultaManager {
  unir(
    pendencias: InsumoPendenciaComEmpresa[],
    movimentos: InsumoNfMovimentoEntrada[],
    contexto: InsumoNfConsultaContexto,
  ): InsumoNfDetalhe[] {
    const detalhesPorChave = new Map<string, InsumoNfDetalhe>();

    for (const pendencia of pendencias) {
      detalhesPorChave.set(
        this.chavePendencia(pendencia),
        this.mapearPendencia(pendencia, contexto),
      );
    }

    for (const movimento of movimentos) {
      const chave = this.chaveMovimento(movimento);
      const existente = detalhesPorChave.get(chave);
      if (existente) {
        detalhesPorChave.set(chave, this.aplicarMovimentoSobrePendencia(existente, movimento));
        continue;
      }
      detalhesPorChave.set(chave, this.mapearMovimento(movimento, contexto));
    }

    return [...detalhesPorChave.values()].sort((a, b) => this.compararPorData(a, b));
  }

  private mapearPendencia(
    pendencia: InsumoPendenciaComEmpresa,
    contexto: InsumoNfConsultaContexto,
  ): InsumoNfDetalhe {
    return {
      id: pendencia.id,
      numeroNf: pendencia.numero_nf,
      data: pendencia.data_emissao_nf,
      quantidadeNf: pendencia.quantidade_nf,
      unidadeNf: pendencia.unidade_nf,
      quantidadeEstoque:
        contexto.fatorConversao > 0
          ? pendencia.quantidade_nf * contexto.fatorConversao
          : null,
      unidadeEstoque: contexto.unidadeEstoque,
      valorItem: pendencia.valor_total_item,
      fornecedor: pendencia.fornecedor_nome || pendencia.fornecedor_razao_social,
      cfop: pendencia.cfop_entrada,
      ncm: pendencia.ncm_produto,
      categoria: pendencia.categoria_compra_descricao,
      natureza: pendencia.natureza_operacao,
      insumoNome: pendencia.status === 'resolvido' ? contexto.insumoNome : null,
      status: pendencia.status,
      omieNIdReceb: pendencia.omie_n_id_receb,
      omieNIdItem: pendencia.omie_n_id_item,
    };
  }

  /**
   * Movimento de entrada_nf guarda só o delta já convertido.
   * Sem pendência, não reinventamos a qtd da NF via fator atual (isso muda se o fator for corrigido).
   */
  private mapearMovimento(
    movimento: InsumoNfMovimentoEntrada,
    contexto: InsumoNfConsultaContexto,
  ): InsumoNfDetalhe {
    return {
      id: movimento.id,
      numeroNf: movimento.numeroNf,
      data: movimento.createdAt,
      quantidadeNf: null,
      unidadeNf: null,
      quantidadeEstoque: movimento.deltaQuantidade,
      unidadeEstoque: contexto.unidadeEstoque,
      valorItem: movimento.custoUnitario * movimento.deltaQuantidade,
      fornecedor: null,
      cfop: null,
      ncm: null,
      categoria: null,
      natureza: null,
      insumoNome: contexto.insumoNome,
      status: 'lancada',
      omieNIdReceb: movimento.omieNIdReceb,
      omieNIdItem: movimento.omieNIdItem,
    };
  }

  private aplicarMovimentoSobrePendencia(
    detalhe: InsumoNfDetalhe,
    movimento: InsumoNfMovimentoEntrada,
  ): InsumoNfDetalhe {
    return {
      ...detalhe,
      quantidadeEstoque: movimento.deltaQuantidade,
      valorItem: movimento.custoUnitario * movimento.deltaQuantidade,
      status: detalhe.status === 'pendente' ? 'lancada' : detalhe.status,
    };
  }

  private chavePendencia(pendencia: InsumoPendenciaComEmpresa): string {
    return this.chaveOmie(pendencia.omie_n_id_receb, pendencia.omie_n_id_item)
      ?? `pend:${pendencia.id}`;
  }

  private chaveMovimento(movimento: InsumoNfMovimentoEntrada): string {
    return this.chaveOmie(movimento.omieNIdReceb, movimento.omieNIdItem)
      ?? `mov:${movimento.id}`;
  }

  private chaveOmie(recebimento: number | null, item: number | null): string | null {
    return recebimento !== null && recebimento > 0 && item !== null && item > 0
      ? `${recebimento}:${item}`
      : null;
  }

  private compararPorData(a: InsumoNfDetalhe, b: InsumoNfDetalhe): number {
    if (a.data === null) return b.data === null ? 0 : 1;
    if (b.data === null) return -1;
    return b.data.localeCompare(a.data);
  }
}

export const insumoNfConsultaManager = new InsumoNfConsultaManager();
