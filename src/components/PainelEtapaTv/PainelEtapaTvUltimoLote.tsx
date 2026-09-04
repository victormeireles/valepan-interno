'use client';

import type { EtapaProductItem } from '@/components/Realizado/etapa/types';
import type { PainelEtapaTvUltimoLote } from '@/domain/painel-etapa-tv/painel-etapa-tv-types';
import { formatLocalTimeHHmm } from '@/lib/utils/date-utils';
import PainelEtapaTvOpCard from './PainelEtapaTvOpCard';
import {
  PAINEL_ETAPA_TV_LIST_CLASS,
  PAINEL_ETAPA_TV_SECTION_CLASS,
} from './painel-etapa-tv-layout';
import { PainelEtapaTvProductMapper } from './painel-etapa-tv-product-mapper';

type PainelEtapaTvUltimoLoteProps = {
  lotes: PainelEtapaTvUltimoLote[];
  products: EtapaProductItem[];
  unit: string;
  showTipoEstoqueMarcaBadge?: boolean;
};

function loteCaption(lote: PainelEtapaTvUltimoLote, unit: string): string {
  const hora = formatLocalTimeHHmm(lote.produzidoEm) ?? '—';
  return `${lote.quantidade.toLocaleString('pt-BR')} ${unit} · ${hora}`;
}

export default function PainelEtapaTvUltimoLote({
  lotes,
  products,
  unit,
  showTipoEstoqueMarcaBadge = false,
}: PainelEtapaTvUltimoLoteProps) {
  return (
    <section className={PAINEL_ETAPA_TV_SECTION_CLASS}>
      <h2 className="shrink-0 text-sm font-bold tracking-tight text-text-strong">
        Últimos lançamentos
      </h2>
      {lotes.length === 0 ? (
        <p className="text-sm text-text-muted">Nenhum lançamento nesta janela</p>
      ) : (
        <div className={PAINEL_ETAPA_TV_LIST_CLASS}>
          {lotes.map((lote) => {
            const product = PainelEtapaTvProductMapper.findById(products, lote.ordemId);
            const caption = loteCaption(lote, unit);
            if (!product) {
              return (
                <p key={lote.ordemId} className="shrink-0 text-sm text-text-muted">
                  {caption} · {lote.produtoNome}
                </p>
              );
            }
            return (
              <PainelEtapaTvOpCard
                key={lote.ordemId}
                product={product}
                caption={caption}
                showTipoEstoqueMarcaBadge={showTipoEstoqueMarcaBadge}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
