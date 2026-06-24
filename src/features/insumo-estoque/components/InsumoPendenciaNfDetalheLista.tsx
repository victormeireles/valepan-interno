'use client';

import type { InsumoPendenciaComEmpresa } from '@/domain/types/insumo-estoque-db';
import InsumoPendenciaNfDetalheItem from '@/features/insumo-estoque/components/InsumoPendenciaNfDetalheItem';

type Props = {
  pendencias: InsumoPendenciaComEmpresa[];
  unidadeNf: string | null;
  mostrarFornecedor?: boolean;
};

export default function InsumoPendenciaNfDetalheLista({
  pendencias,
  unidadeNf,
  mostrarFornecedor = true,
}: Props) {
  const ordenadas = [...pendencias].sort((a, b) => {
    const dataA = a.data_emissao_nf ?? '';
    const dataB = b.data_emissao_nf ?? '';
    return dataB.localeCompare(dataA);
  });

  return (
    <ul className="divide-y divide-stone-100">
      {ordenadas.map((pendencia) => (
        <li key={pendencia.id} className="px-4 py-3">
          <InsumoPendenciaNfDetalheItem
            pendencia={pendencia}
            unidadeNf={unidadeNf}
            mostrarFornecedor={mostrarFornecedor}
          />
        </li>
      ))}
    </ul>
  );
}
