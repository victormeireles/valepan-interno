import { revalidatePath } from 'next/cache';
import { ordemProducaoRepository } from '@/data/producao/OrdemProducaoRepository';
import {
  parseMetaEmbalagemBatchText,
  type MetaEmbalagemBatchRow,
} from '@/domain/embalagem/meta-embalagem-batch';
import type { OrdemProducaoKey } from '@/domain/types/ordem-producao';
import { deriveQuantidadesFromAssadeiras } from '@/domain/producao/ordem-derivados';
import {
  pedidoEmbalagemService,
  EstoqueResolverError,
} from '@/lib/services/pedido-embalagem-service';
import { ordemProducaoMetaService } from '@/lib/services/ordem-producao-meta-service';

export type MetaEmbalagemBatchPreviewItem = {
  linha: number;
  acao: 'criar' | 'alterar' | 'sem_mudanca' | 'erro';
  dataProducao: string;
  dataEtiqueta: string;
  tipoEstoque: string;
  produto: string;
  observacao: string;
  latasNova: number;
  latasAtual?: number;
  caixasDerivadas?: number;
  pedidoEmbalagemId?: string;
  erro?: string;
};

export type MetaEmbalagemBatchPreviewResult = {
  items: MetaEmbalagemBatchPreviewItem[];
  resumo: {
    criar: number;
    alterar: number;
    semMudanca: number;
    erros: number;
  };
  parseErrors: ReturnType<typeof parseMetaEmbalagemBatchText>['errors'];
  canApply: boolean;
};

export type MetaEmbalagemBatchApplyResult = {
  criados: number;
  alterados: number;
  datasReconciliadas: string[];
};

type AssadeiraContext = {
  assadeiraId: string;
  unidadesPorAssadeiraEfetiva: number;
  boxUnits: number | null;
};

function latasEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-6;
}

function quantidadeFromLatas(latas: number, ctx: AssadeiraContext) {
  return deriveQuantidadesFromAssadeiras({
    assadeiras: latas,
    unidadesPorAssadeira: ctx.unidadesPorAssadeiraEfetiva,
    boxUnits: ctx.boxUnits,
  });
}

async function resolveRowContext(row: MetaEmbalagemBatchRow): Promise<{
  key: OrdemProducaoKey;
  assadeira: AssadeiraContext;
  quantidade: ReturnType<typeof quantidadeFromLatas>;
}> {
  const { tipoEstoqueId, produtoId } = await pedidoEmbalagemService.resolveIds(
    row.tipoEstoque,
    row.produto,
  );
  const assadeira = await pedidoEmbalagemService.resolveAssadeiraDefault(produtoId);
  const key: OrdemProducaoKey = {
    dataProducao: row.dataProducao,
    dataFabricacaoEtiqueta: row.dataEtiqueta,
    tipoEstoqueId,
    produtoId,
    observacao: row.observacao,
    assadeiraId: assadeira.assadeiraId,
  };
  return {
    key,
    assadeira,
    quantidade: quantidadeFromLatas(row.latas, assadeira),
  };
}

export class MetaEmbalagemBatchService {
  async preview(text: string): Promise<MetaEmbalagemBatchPreviewResult> {
    const parsed = parseMetaEmbalagemBatchText(text);
    const items: MetaEmbalagemBatchPreviewItem[] = [];

    for (const err of parsed.errors) {
      items.push({
        linha: err.linha,
        acao: 'erro',
        dataProducao: '',
        dataEtiqueta: '',
        tipoEstoque: '',
        produto: err.texto,
        observacao: '',
        latasNova: 0,
        erro: err.erro,
      });
    }

    const seenKeys = new Set<string>();
    for (const row of parsed.rows) {
      const keyStr = [
        row.dataProducao,
        row.dataEtiqueta,
        row.tipoEstoque,
        row.produto,
        row.observacao,
      ].join('|');
      if (seenKeys.has(keyStr)) continue;
      seenKeys.add(keyStr);

      try {
        const { key, quantidade } = await resolveRowContext(row);
        const existing = await ordemProducaoRepository.findByKey(key);
        const latasAtual = existing?.assadeiras ?? 0;
        const caixasDerivadas = quantidade.caixas > 0 ? quantidade.caixas : undefined;

        if (!existing) {
          items.push({
            linha: row.linha,
            acao: 'criar',
            dataProducao: row.dataProducao,
            dataEtiqueta: row.dataEtiqueta,
            tipoEstoque: row.tipoEstoque,
            produto: row.produto,
            observacao: row.observacao,
            latasNova: row.latas,
            caixasDerivadas,
          });
        } else if (latasEqual(latasAtual, row.latas)) {
          items.push({
            linha: row.linha,
            acao: 'sem_mudanca',
            dataProducao: row.dataProducao,
            dataEtiqueta: row.dataEtiqueta,
            tipoEstoque: row.tipoEstoque,
            produto: row.produto,
            observacao: row.observacao,
            latasNova: row.latas,
            latasAtual,
            caixasDerivadas,
            pedidoEmbalagemId: existing.id,
          });
        } else {
          items.push({
            linha: row.linha,
            acao: 'alterar',
            dataProducao: row.dataProducao,
            dataEtiqueta: row.dataEtiqueta,
            tipoEstoque: row.tipoEstoque,
            produto: row.produto,
            observacao: row.observacao,
            latasNova: row.latas,
            latasAtual,
            caixasDerivadas,
            pedidoEmbalagemId: existing.id,
          });
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Erro ao resolver pedido';
        items.push({
          linha: row.linha,
          acao: 'erro',
          dataProducao: row.dataProducao,
          dataEtiqueta: row.dataEtiqueta,
          tipoEstoque: row.tipoEstoque,
          produto: row.produto,
          observacao: row.observacao,
          latasNova: row.latas,
          erro: message,
        });
      }
    }

    items.sort((a, b) => a.linha - b.linha);

    const resumo = {
      criar: items.filter((i) => i.acao === 'criar').length,
      alterar: items.filter((i) => i.acao === 'alterar').length,
      semMudanca: items.filter((i) => i.acao === 'sem_mudanca').length,
      erros: items.filter((i) => i.acao === 'erro').length,
    };

    return {
      items,
      resumo,
      parseErrors: parsed.errors,
      canApply: resumo.erros === 0 && (resumo.criar > 0 || resumo.alterar > 0),
    };
  }

  async apply(text: string): Promise<MetaEmbalagemBatchApplyResult> {
    const preview = await this.preview(text);
    if (!preview.canApply) {
      throw new Error('Corrija os erros antes de aplicar o lote');
    }

    const parsed = parseMetaEmbalagemBatchText(text);
    const datas = new Set<string>();
    let criados = 0;
    let alterados = 0;

    const seenKeys = new Set<string>();
    for (const row of parsed.rows) {
      const dedupeKey = [
        row.dataProducao,
        row.dataEtiqueta,
        row.tipoEstoque,
        row.produto,
        row.observacao,
      ].join('|');
      if (seenKeys.has(dedupeKey)) continue;
      seenKeys.add(dedupeKey);

      const { key } = await resolveRowContext(row);
      const existing = await ordemProducaoRepository.findByKey(key);
      datas.add(row.dataProducao);

      if (!existing) {
        try {
          await ordemProducaoMetaService.createFromLatas({
            dataProducao: row.dataProducao,
            dataEtiqueta: row.dataEtiqueta,
            tipoEstoque: row.tipoEstoque,
            produto: row.produto,
            latas: row.latas,
            observacao: row.observacao,
          });
        } catch (e) {
          if (e instanceof EstoqueResolverError) throw e;
          throw e;
        }
        criados += 1;
        continue;
      }

      if (latasEqual(existing.assadeiras, row.latas)) continue;

      await ordemProducaoMetaService.updateQuantidade(existing.id, row.latas);
      alterados += 1;
    }

    revalidatePath('/api/painel/embalagem');

    return {
      criados,
      alterados,
      datasReconciliadas: [...datas],
    };
  }
}

export const metaEmbalagemBatchService = new MetaEmbalagemBatchService();
export { EstoqueResolverError };
