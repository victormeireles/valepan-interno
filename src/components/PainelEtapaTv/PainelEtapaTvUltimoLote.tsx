'use client';

import type { EtapaProductItem } from '@/components/Realizado/etapa/types';
import type { PainelEtapaTvUltimoLote } from '@/domain/painel-etapa-tv/painel-etapa-tv-types';
import { formatLocalTimeHHmm } from '@/lib/utils/date-utils';
import PainelEtapaTvOpCard from './PainelEtapaTvOpCard';

type PainelEtapaTvUltimoLoteProps = {
  lote: PainelEtapaTvUltimoLote | null;
  product: EtapaProductItem | undefined;
  unit: string;
  showTipoEstoqueMarcaBadge?: boolean;
};

export default function PainelEtapaTvUltimoLote({
  lote,
  product,
  unit,
  showTipoEstoqueMarcaBadge = false,
}: PainelEtapaTvUltimoLoteProps) {
  return (
    <section className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
      <h2 className="shrink-0 text-sm font-bold tracking-tight text-text-strong">
        Último lançamento
      </h2>
      {lote == null ? (
        <p className="text-sm text-text-muted">Nenhum lançamento nesta janela</p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          <p className="shrink-0 font-mono text-sm tabular-nums text-text-strong">
            {lote.quantidade.toLocaleString('pt-BR')} {unit} ·{' '}
            {formatLocalTimeHHmm(lote.produzidoEm) ?? '—'} · {lote.produtoNome}
          </p>
          {product ? (
            <PainelEtapaTvOpCard
              product={product}
              instanceId={`tv-ultimo-${product.id}`}
              showTipoEstoqueMarcaBadge={showTipoEstoqueMarcaBadge}
            />
          ) : null}
        </div>
      )}
    </section>
  );
}
