'use client';

import { useState } from 'react';
import type { InsumoPendenciaProdutoGrupo } from '@/domain/insumos/insumo-pendencia-grupo';
import type { InsumoPendenciaStatus } from '@/domain/types/insumo-estoque';
import { Accordion } from '@/components/ui/Accordion';
import InsumoPendenciaFornecedorCell from '@/features/insumo-estoque/components/InsumoPendenciaFornecedorCell';
import InsumoPendenciaNfDetalheLista from '@/features/insumo-estoque/components/InsumoPendenciaNfDetalheLista';
import InsumoPendenciaProdutoMeta from '@/features/insumo-estoque/components/InsumoPendenciaProdutoMeta';
import { useInsumoPendenciaNfsQuery } from '@/features/insumo-estoque/hooks/useInsumoPendenciaNfsQuery';
import { buildNfsTargetFromGrupo } from '@/features/insumo-estoque/utils/insumo-pendencia-nfs-target';

type Props = {
  grupo: InsumoPendenciaProdutoGrupo;
  statuses: InsumoPendenciaStatus[];
};

export default function InsumoPendenciaMobileDetalhes({ grupo, statuses }: Props) {
  const [nfsOpen, setNfsOpen] = useState(false);
  const { pendencias, loading, error, load } = useInsumoPendenciaNfsQuery();

  const handleNfsToggle = (open: boolean) => {
    setNfsOpen(open);
    if (open) {
      void load(buildNfsTargetFromGrupo(grupo, statuses));
    }
  };

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
        open={nfsOpen}
        onOpenChange={handleNfsToggle}
      >
        {loading ? (
          <p className="py-4 text-center text-sm text-stone-500">Carregando notas…</p>
        ) : error ? (
          <p className="py-4 text-center text-sm text-red-600">{error}</p>
        ) : (
          <InsumoPendenciaNfDetalheLista
            pendencias={pendencias}
            unidadeNf={grupo.unidadeNf}
            mostrarFornecedor={grupo.contexto.fornecedoresDistintos !== 1}
          />
        )}
      </Accordion>
    </div>
  );
}
