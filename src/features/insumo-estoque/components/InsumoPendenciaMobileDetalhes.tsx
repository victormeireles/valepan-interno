'use client';

import type { InsumoPendenciaProdutoGrupo } from '@/domain/insumos/insumo-pendencia-grupo';
import { Accordion } from '@/components/ui/Accordion';
import InsumoPendenciaFornecedorCell from '@/features/insumo-estoque/components/InsumoPendenciaFornecedorCell';
import InsumoPendenciaNfDetalheLista from '@/features/insumo-estoque/components/InsumoPendenciaNfDetalheLista';
import InsumoPendenciaProdutoMeta from '@/features/insumo-estoque/components/InsumoPendenciaProdutoMeta';

type Props = {
  grupo: InsumoPendenciaProdutoGrupo;
};

export default function InsumoPendenciaMobileDetalhes({ grupo }: Props) {
  return (
    <div className="mt-3 space-y-3 pl-14">
      <InsumoPendenciaFornecedorCell
        empresaNome={grupo.empresaNome}
        contexto={grupo.contexto}
      />
      <InsumoPendenciaProdutoMeta grupo={grupo} />

      <Accordion
        title="Notas fiscais"
        summary={`${grupo.nfsDistintas} NF${grupo.nfsDistintas === 1 ? '' : 's'}`}
        icon="receipt_long"
        defaultOpen={false}
      >
        <InsumoPendenciaNfDetalheLista
          pendencias={grupo.pendencias}
          unidadeNf={grupo.unidadeNf}
          mostrarFornecedor={grupo.contexto.fornecedoresDistintos !== 1}
        />
      </Accordion>
    </div>
  );
}
