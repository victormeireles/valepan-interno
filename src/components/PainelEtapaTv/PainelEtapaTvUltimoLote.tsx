'use client';

import type { EtapaProductItem } from '@/components/Realizado/etapa/types';
import type { PainelEtapaTvUltimoLote } from '@/domain/painel-etapa-tv/painel-etapa-tv-types';
import { formatLocalTimeHHmm } from '@/lib/utils/date-utils';
import PainelEtapaTvOpCard from './PainelEtapaTvOpCard';
import { PainelEtapaTvProductMapper } from './painel-etapa-tv-product-mapper';

type PainelEtapaTvUltimoLoteProps = {
  lotes: PainelEtapaTvUltimoLote[];
  products: EtapaProductItem[];
  unit: string;
  showTipoEstoqueMarcaBadge?: boolean;
};

export default function PainelEtapaTvUltimoLote({
  lotes,
  products,
  unit,
  showTipoEstoqueMarcaBadge = false,
}: PainelEtapaTvUltimoLoteProps) {
  return (
    <section className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
      <h2 className="shrink-0 text-sm font-bold tracking-tight text-text-strong">
        Últimos lançamentos
      </h2>
      {lotes.length === 0 ? (
        <p className="text-sm text-text-muted">Nenhum lançamento nesta janela</p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          {lotes.map((lote) => {
            const product = PainelEtapaTvProductMapper.findById(products, lote.ordemId);
            return (
              <article key={lote.ordemId} className="flex min-w-0 shrink-0 flex-col gap-1">
                <p className="font-mono text-sm tabular-nums text-text-strong">
                  {lote.quantidade.toLocaleString('pt-BR')} {unit} ·{' '}
                  {formatLocalTimeHHmm(lote.produzidoEm) ?? '—'}
                </p>
                {product ? (
                  <PainelEtapaTvOpCard
                    product={product}
                    instanceId={`tv-ultimo-${product.id}`}
                    showTipoEstoqueMarcaBadge={showTipoEstoqueMarcaBadge}
                  />
                ) : (
                  <p className="text-sm text-text-muted">{lote.produtoNome}</p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
