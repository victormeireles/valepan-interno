import { derivarUnidadeEmbalagem } from '@/domain/embalagem/painel-quantidade';
import {
  resolveMetaEfetiva,
  type AssadeiraMetaContext,
} from '@/domain/producao-etapa/etapa-meta-referencia-resolver';
import {
  resolveModoQuantidadeEtapa,
  somarLotesEtapa,
} from '@/domain/producao-etapa/etapa-quantidade';
import type { EmbalagemLoteRecord } from '@/domain/types/embalagem-lote';
import type { FermentacaoLoteRecord } from '@/domain/types/fermentacao-lote';
import type { OrdemProducaoRecord } from '@/domain/types/ordem-producao';
import { formatBrazilHourMinuteLabel } from '@/lib/utils/date-utils';
import type {
  PainelProducaoLoteView,
  PainelProducaoProduct,
  PainelProducaoRitmoEntry,
  PainelProducaoStageView,
} from './painel-producao-types';

type BuildStageLotesInput = {
  lotes: FermentacaoLoteRecord[] | EmbalagemLoteRecord[];
  kind: 'etapa' | 'embalagem';
  unit: string;
};

function formatShortClockFromIso(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '0h00';
  return formatBrazilHourMinuteLabel(date);
}

function buildEtapaLotes(input: BuildStageLotesInput): PainelProducaoLoteView[] {
  if (input.kind === 'etapa') {
    return (input.lotes as FermentacaoLoteRecord[]).map((lote) => ({
      qtd: `${lote.assadeiras > 0 ? lote.assadeiras : lote.unidades} ${input.unit}`,
      hora: formatShortClockFromIso(lote.produzidoEm),
    }));
  }

  return (input.lotes as EmbalagemLoteRecord[]).map((lote) => {
    const { unidade, valor } = derivarUnidadeEmbalagem(lote.quantidade);
    return {
      qtd: `${valor} ${unidade}`,
      hora: formatShortClockFromIso(lote.produzidoEm),
    };
  });
}

function resolveStageFim(stage: PainelProducaoStageView): string | null {
  if (stage.done < stage.meta || stage.lotes.length === 0) return null;
  return stage.lotes[stage.lotes.length - 1].hora;
}

function buildEtapaStageView(
  lotes: FermentacaoLoteRecord[],
  meta: number,
  unit: string,
): PainelProducaoStageView {
  const produzido = somarLotesEtapa(
    lotes.map((lote) => ({ assadeiras: lote.assadeiras, unidades: lote.unidades })),
  );
  const done = unit === 'lt' ? produzido.assadeiras : produzido.unidades;
  const stage: PainelProducaoStageView = {
    done,
    meta,
    unit,
    fim: null,
    lotes: buildEtapaLotes({ lotes, kind: 'etapa', unit }),
  };
  stage.fim = resolveStageFim(stage);
  return stage;
}

function buildEmbalagemStageView(
  lotes: EmbalagemLoteRecord[],
  meta: number,
): PainelProducaoStageView {
  const done = lotes.reduce((sum, lote) => sum + derivarUnidadeEmbalagem(lote.quantidade).valor, 0);
  const stage: PainelProducaoStageView = {
    done,
    meta,
    unit: 'cx',
    fim: null,
    lotes: buildEtapaLotes({ lotes, kind: 'embalagem', unit: 'cx' }),
  };
  stage.fim = resolveStageFim(stage);
  return stage;
}

export function buildPainelProducaoProduct(input: {
  ordem: OrdemProducaoRecord;
  produto: string;
  cliente: string;
  congelado: boolean;
  assadeiraNome?: string;
  fermentacaoLotes: FermentacaoLoteRecord[];
  fornoLotes: FermentacaoLoteRecord[];
  embalagemLotes: EmbalagemLoteRecord[];
  assadeiraCtx?: AssadeiraMetaContext;
}): PainelProducaoProduct {
  const modo = resolveModoQuantidadeEtapa(input.ordem.assadeiraId);
  const unit = modo === 'assadeiras' ? 'lt' : 'un';
  const fermMeta = resolveMetaEfetiva('fermentacao', input.ordem, input.assadeiraCtx);
  const fornoMeta = resolveMetaEfetiva('forno', input.ordem, input.assadeiraCtx);
  const embMeta = resolveMetaEfetiva('embalagem', input.ordem, input.assadeiraCtx);

  return {
    id: input.ordem.id,
    ordemPlanejamento: input.ordem.ordemPlanejamento,
    name: input.produto,
    cliente: input.cliente,
    congelado: input.congelado || undefined,
    assadeira: input.assadeiraNome,
    fermentacaoFinalizada: input.ordem.fermentacaoFinalizada,
    fornoFinalizada: input.ordem.fornoFinalizada,
    embalagemFinalizada: input.ordem.embalagemFinalizada,
    ferm: buildEtapaStageView(input.fermentacaoLotes, fermMeta, unit),
    forno: buildEtapaStageView(input.fornoLotes, fornoMeta, unit),
    emb: buildEmbalagemStageView(input.embalagemLotes, embMeta),
  };
}

export function collectRitmoEntriesFromProducts(
  products: PainelProducaoProduct[],
  stage: 'ferm' | 'forno' | 'emb',
  lotesByOrdem: {
    fermentacao: Map<string, FermentacaoLoteRecord[]>;
    forno: Map<string, FermentacaoLoteRecord[]>;
    embalagem: Map<string, EmbalagemLoteRecord[]>;
  },
): PainelProducaoRitmoEntry[] {
  const entries: PainelProducaoRitmoEntry[] = [];

  for (const product of products) {
    const ordemId = product.id;

    if (stage === 'ferm') {
      for (const lote of lotesByOrdem.fermentacao.get(ordemId) ?? []) {
        const qty = lote.assadeiras > 0 ? lote.assadeiras : lote.unidades;
        if (qty > 0) entries.push({ quantity: qty, timestamp: lote.produzidoEm });
      }
    }

    if (stage === 'forno') {
      for (const lote of lotesByOrdem.forno.get(ordemId) ?? []) {
        const qty = lote.assadeiras > 0 ? lote.assadeiras : lote.unidades;
        if (qty > 0) entries.push({ quantity: qty, timestamp: lote.produzidoEm });
      }
    }

    if (stage === 'emb') {
      for (const lote of lotesByOrdem.embalagem.get(ordemId) ?? []) {
        const qty = derivarUnidadeEmbalagem(lote.quantidade).valor;
        if (qty > 0) entries.push({ quantity: qty, timestamp: lote.produzidoEm });
      }
    }
  }

  return entries;
}
