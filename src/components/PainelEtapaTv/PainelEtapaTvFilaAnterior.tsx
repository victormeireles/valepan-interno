'use client';

import type { EtapaProductItem } from '@/components/Realizado/etapa/types';
import { PainelEtapaTvFilaCopy } from '@/domain/painel-etapa-tv/fila-anterior/painel-etapa-tv-fila-copy';
import type {
  PainelEtapaTvFilaEtapa,
  PainelEtapaTvFilaOp,
} from '@/domain/painel-etapa-tv/fila-anterior/painel-etapa-tv-fila-op';
import PainelEtapaTvFilaOpCard, {
  type PainelEtapaTvFilaOpCardIdentity,
} from './PainelEtapaTvFilaOpCard';
import {
  PAINEL_ETAPA_TV_LIST_CLASS,
  PAINEL_ETAPA_TV_SECTION_CLASS,
} from './painel-etapa-tv-layout';
import { PainelEtapaTvProductMapper } from './painel-etapa-tv-product-mapper';

type PainelEtapaTvFilaAnteriorProps = {
  etapa: PainelEtapaTvFilaEtapa;
  ops: PainelEtapaTvFilaOp[];
  products: EtapaProductItem[];
  showTipoEstoqueMarcaBadge?: boolean;
};

function identityFrom(
  op: PainelEtapaTvFilaOp,
  products: EtapaProductItem[],
): PainelEtapaTvFilaOpCardIdentity {
  const product = PainelEtapaTvProductMapper.findById(products, op.ordemId);
  if (product) {
    return {
      produto: product.produto,
      assadeira: product.assadeira,
      assadeiraCorHex: product.assadeiraCorHex,
      tipoEstoqueCliente: product.cliente,
    };
  }
  return {
    produto: op.produtoNome,
    assadeira: op.assadeiraNome || undefined,
  };
}

export default function PainelEtapaTvFilaAnterior({
  etapa,
  ops,
  products,
  showTipoEstoqueMarcaBadge = false,
}: PainelEtapaTvFilaAnteriorProps) {
  return (
    <section className={PAINEL_ETAPA_TV_SECTION_CLASS}>
      <h2 className="shrink-0 text-sm font-bold tracking-tight text-text-strong">
        {PainelEtapaTvFilaCopy.titulo(etapa)}
      </h2>
      {ops.length === 0 ? (
        <p className="text-sm text-text-muted">{PainelEtapaTvFilaCopy.emptyMessage(etapa)}</p>
      ) : (
        <div className={PAINEL_ETAPA_TV_LIST_CLASS}>
          {ops.map((op) => (
            <PainelEtapaTvFilaOpCard
              key={op.ordemId}
              etapa={etapa}
              op={op}
              identity={identityFrom(op, products)}
              showTipoEstoqueMarcaBadge={showTipoEstoqueMarcaBadge}
            />
          ))}
        </div>
      )}
    </section>
  );
}
