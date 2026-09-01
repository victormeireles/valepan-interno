'use client';

import EtapaProductAccordion from '@/components/Realizado/etapa/EtapaProductAccordion';
import type { EtapaProductItem } from '@/components/Realizado/etapa/types';

type PainelEtapaTvOpCardProps = {
  product: EtapaProductItem;
  instanceId: string;
  showTipoEstoqueMarcaBadge?: boolean;
};

export default function PainelEtapaTvOpCard({
  product,
  instanceId,
  showTipoEstoqueMarcaBadge = false,
}: PainelEtapaTvOpCardProps) {
  return (
    <EtapaProductAccordion
      instanceId={instanceId}
      produto={product.produto}
      somaProduzido={product.somaProduzido}
      somaAProduzir={product.somaAProduzir}
      unidade={product.unidade}
      metaOpLabel={product.metaOpLabel}
      congelado={product.congelado}
      assadeira={product.assadeira}
      assadeiraCorHex={product.assadeiraCorHex}
      cliente={product.cliente}
      observacao={product.observacao}
      dataEtiqueta={product.dataEtiqueta}
      hasPhoto={product.hasPhoto}
      horario={product.horario}
      detalhesProduzido={product.detalhesProduzido}
      detalhesMeta={product.detalhesMeta}
      cadeiaBarras={product.cadeiaBarras}
      productionStatusOverride={product.productionStatusOverride}
      hasMeta
      showTipoEstoqueMarcaBadge={showTipoEstoqueMarcaBadge}
      expandable={false}
      renderLots={() => null}
    />
  );
}
