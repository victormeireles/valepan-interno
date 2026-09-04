'use client';

import type { EtapaProductItem } from '@/components/Realizado/etapa/types';
import type { PainelEtapaTvOpFonte } from '@/domain/painel-etapa-tv/painel-etapa-tv-types';
import PainelEtapaTvOpCard from './PainelEtapaTvOpCard';
import {
  PAINEL_ETAPA_TV_LIST_CLASS,
  PAINEL_ETAPA_TV_SECTION_CLASS,
} from './painel-etapa-tv-layout';
import { PainelEtapaTvProductMapper } from './painel-etapa-tv-product-mapper';

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
    <section className={PAINEL_ETAPA_TV_SECTION_CLASS}>
      <h2 className="shrink-0 text-sm font-bold tracking-tight text-text-strong">
        Próximas OPs
      </h2>
      {ops.length === 0 ? (
        <p className="text-sm text-text-muted">Nenhuma OP na fila</p>
      ) : (
        <div className={PAINEL_ETAPA_TV_LIST_CLASS}>
          {ops.map((op) => {
            const product = PainelEtapaTvProductMapper.findById(products, op.ordemId);
            if (!product) return null;
            return (
              <PainelEtapaTvOpCard
                key={op.ordemId}
                product={product}
                showTipoEstoqueMarcaBadge={showTipoEstoqueMarcaBadge}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
