import { revalidatePath } from 'next/cache';
import { ordemProducaoRepository } from '@/data/producao/OrdemProducaoRepository';
import {
  parseMetaEmbalagemBatchText,
  type MetaEmbalagemBatchRow,
} from '@/domain/embalagem/meta-embalagem-batch';
import type { OrdemProducaoKey } from '@/domain/types/ordem-producao';
import {
  deriveQuantidadesFromAssadeiras,
  deriveQuantidadesFromUnidades,
} from '@/domain/producao/ordem-derivados';
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
  assadeira?: string;
  modoQuantidade: 'latas' | 'unidades';
  latasNova: number;
  latasAtual?: number;
  unidadesNova?: number;
  unidadesAtual?: number;
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
  nome?: string;
};

type RowContextLatas = {
  mode: 'latas';
  key: OrdemProducaoKey;
  assadeira: AssadeiraContext;
  quantidade: ReturnType<typeof deriveQuantidadesFromAssadeiras>;
};

type RowContextUnidades = {
  mode: 'unidades';
  key: OrdemProducaoKey;
  quantidade: ReturnType<typeof deriveQuantidadesFromUnidades>;
};

type RowContext = RowContextLatas | RowContextUnidades;

function qtyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-6;
}

function quantidadeFromLatas(latas: number, ctx: AssadeiraContext) {
  return deriveQuantidadesFromAssadeiras({
    assadeiras: latas,
    unidadesPorAssadeira: ctx.unidadesPorAssadeiraEfetiva,
    boxUnits: ctx.boxUnits,
  });
}

async function resolveRowContext(row: MetaEmbalagemBatchRow): Promise<RowContext> {
  const { tipoEstoqueId, produtoId } = await pedidoEmbalagemService.resolveIds(
    row.tipoEstoque,
    row.produto,
  );

  const hasAssadeira = await pedidoEmbalagemService.hasAssadeiraForProduto(produtoId);

  if (!hasAssadeira) {
    const boxUnits = await pedidoEmbalagemService.resolveBoxUnitsForProduto(produtoId);
    const key: OrdemProducaoKey = {
      dataProducao: row.dataProducao,
      dataFabricacaoEtiqueta: row.dataEtiqueta,
      tipoEstoqueId,
      produtoId,
      observacao: row.observacao,
      assadeiraId: '',
    };
    return {
      mode: 'unidades',
      key,
      quantidade: deriveQuantidadesFromUnidades({
        unidades: row.latas,
        boxUnits,
      }),
    };
  }

  const assadeira = await pedidoEmbalagemService.resolveAssadeiraForProduto(
    produtoId,
    row.assadeira,
  );
  if (!assadeira) {
    throw new EstoqueResolverError(`Produto "${row.produto}" não possui assadeira`);
  }

  const key: OrdemProducaoKey = {
    dataProducao: row.dataProducao,
    dataFabricacaoEtiqueta: row.dataEtiqueta,
    tipoEstoqueId,
    produtoId,
    observacao: row.observacao,
    assadeiraId: assadeira.assadeiraId,
  };

  return {
    mode: 'latas',
    key,
    assadeira,
    quantidade: quantidadeFromLatas(row.latas, assadeira),
  };
}

function rowDedupeKey(row: MetaEmbalagemBatchRow): string {
  return [
    row.dataProducao,
    row.dataEtiqueta,
    row.tipoEstoque,
    row.produto,
    row.assadeira,
    row.observacao,
  ].join('|');
}

function buildPreviewItemBase(row: MetaEmbalagemBatchRow, ctx: RowContext) {
  const caixasDerivadas = ctx.quantidade.caixas > 0 ? ctx.quantidade.caixas : undefined;
  const assadeiraLabel =
    ctx.mode === 'latas'
      ? row.assadeira || 'padrão'
      : undefined;

  return {
    linha: row.linha,
    dataProducao: row.dataProducao,
    dataEtiqueta: row.dataEtiqueta,
    tipoEstoque: row.tipoEstoque,
    produto: row.produto,
    observacao: row.observacao,
    assadeira: assadeiraLabel,
    caixasDerivadas,
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
        modoQuantidade: 'latas',
        latasNova: 0,
        erro: err.erro,
      });
    }

    const seenKeys = new Set<string>();
    for (const row of parsed.rows) {
      const keyStr = rowDedupeKey(row);
      if (seenKeys.has(keyStr)) continue;
      seenKeys.add(keyStr);

      try {
        const ctx = await resolveRowContext(row);
        const existing = await ordemProducaoRepository.findByKey(ctx.key);
        const base = buildPreviewItemBase(row, ctx);

        if (ctx.mode === 'unidades') {
          const unidadesAtual = existing?.quantidade.unidades ?? 0;
          const unidadesNova = row.latas;

          if (!existing) {
            items.push({
              ...base,
              acao: 'criar',
              modoQuantidade: 'unidades',
              latasNova: 0,
              unidadesNova,
            });
          } else if (qtyEqual(unidadesAtual, unidadesNova)) {
            items.push({
              ...base,
              acao: 'sem_mudanca',
              modoQuantidade: 'unidades',
              latasNova: 0,
              unidadesNova,
              unidadesAtual,
              pedidoEmbalagemId: existing.id,
            });
          } else {
            items.push({
              ...base,
              acao: 'alterar',
              modoQuantidade: 'unidades',
              latasNova: 0,
              unidadesNova,
              unidadesAtual,
              pedidoEmbalagemId: existing.id,
            });
          }
          continue;
        }

        const latasAtual = existing?.assadeiras ?? 0;

        if (!existing) {
          items.push({
            ...base,
            acao: 'criar',
            modoQuantidade: 'latas',
            latasNova: row.latas,
          });
        } else if (qtyEqual(latasAtual, row.latas)) {
          items.push({
            ...base,
            acao: 'sem_mudanca',
            modoQuantidade: 'latas',
            latasNova: row.latas,
            latasAtual,
            pedidoEmbalagemId: existing.id,
          });
        } else {
          items.push({
            ...base,
            acao: 'alterar',
            modoQuantidade: 'latas',
            latasNova: row.latas,
            latasAtual,
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
          assadeira: row.assadeira || undefined,
          modoQuantidade: 'unidades',
          latasNova: 0,
          unidadesNova: row.latas,
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
      const dedupeKey = rowDedupeKey(row);
      if (seenKeys.has(dedupeKey)) continue;
      seenKeys.add(dedupeKey);

      const ctx = await resolveRowContext(row);
      const existing = await ordemProducaoRepository.findByKey(ctx.key);
      datas.add(row.dataProducao);

      if (!existing) {
        try {
          if (ctx.mode === 'unidades') {
            await ordemProducaoMetaService.createSemAssadeira({
              dataProducao: row.dataProducao,
              dataEtiqueta: row.dataEtiqueta,
              tipoEstoque: row.tipoEstoque,
              produto: row.produto,
              observacao: row.observacao,
              unidades: row.latas,
            });
          } else {
            await ordemProducaoMetaService.createFromLatas({
              dataProducao: row.dataProducao,
              dataEtiqueta: row.dataEtiqueta,
              tipoEstoque: row.tipoEstoque,
              produto: row.produto,
              latas: row.latas,
              observacao: row.observacao,
              assadeiraNome: row.assadeira || undefined,
            });
          }
        } catch (e) {
          if (e instanceof EstoqueResolverError) throw e;
          throw e;
        }
        criados += 1;
        continue;
      }

      if (ctx.mode === 'unidades') {
        if (qtyEqual(existing.quantidade.unidades, row.latas)) continue;
        await ordemProducaoMetaService.updateUnidades(existing.id, row.latas);
        alterados += 1;
        continue;
      }

      if (qtyEqual(existing.assadeiras, row.latas)) continue;

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
