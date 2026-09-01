'use client';

import type { EtapaProductItem } from '@/components/Realizado/etapa/types';
import type { PainelEtapaTvOpFonte } from '@/domain/painel-etapa-tv/painel-etapa-tv-types';
import { PainelEtapaTvProductMapper } from './painel-etapa-tv-product-mapper';
import PainelEtapaTvOpCard from './PainelEtapaTvOpCard';

type PainelEtapaTvProximasOpsProps = {
  ops: PainelEtapaTvOpFonte[];
  products: EtapaProductItem[];
  showTipoEstoqueMarcaBadge?: boolean;
};

export default function PainelEtapaTvProximasOps({
  ops,
  products,
  showTipoEstoqueMarcaBadge = false,
}: PainelEtapaTvProximasOpsProps) {
  return (
    <section className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
      <h2 className="shrink-0 text-sm font-bold tracking-tight text-text-strong">
        Próximas OPs
      </h2>
      {ops.length === 0 ? (
        <p className="text-sm text-text-muted">Nenhuma OP na fila</p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          {ops.map((op) => {
            const product = PainelEtapaTvProductMapper.findById(products, op.ordemId);
            if (!product) return null;
            return (
              <PainelEtapaTvOpCard
                key={op.ordemId}
                product={product}
                instanceId={`tv-proxima-${product.id}`}
                showTipoEstoqueMarcaBadge={showTipoEstoqueMarcaBadge}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
