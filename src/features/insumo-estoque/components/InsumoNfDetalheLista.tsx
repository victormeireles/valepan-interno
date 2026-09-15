'use client';

import type { InsumoNfDetalhe } from '@/domain/insumos/insumo-nf-detalhe';
import InsumoNfDetalheItem from '@/features/insumo-estoque/components/InsumoNfDetalheItem';

type Props = {
  detalhes: InsumoNfDetalhe[];
  mostrarFornecedor?: boolean;
};

export default function InsumoNfDetalheLista({
  detalhes,
  mostrarFornecedor = true,
}: Props) {
  return (
    <ul className="divide-y divide-stone-100">
      {detalhes.map((detalhe) => (
        <li key={detalhe.id} className="px-4 py-3">
          <InsumoNfDetalheItem
            detalhe={detalhe}
            mostrarFornecedor={mostrarFornecedor}
          />
        </li>
      ))}
    </ul>
  );
}
