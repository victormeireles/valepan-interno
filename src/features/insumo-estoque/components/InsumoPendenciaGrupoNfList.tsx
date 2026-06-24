'use client';

import type { InsumoPendenciaProdutoGrupo } from '@/domain/insumos/insumo-pendencia-grupo';
import { calcularQuantidadeEntrada } from '@/domain/insumos/insumo-entrada-calculo';
import InsumoPendenciaNfDetalheItem from '@/features/insumo-estoque/components/InsumoPendenciaNfDetalheItem';
import { formatInsumoQuantidade } from '@/features/insumo-estoque/utils/formatters';
import { formatUnidadeLabel } from '@/features/insumo-estoque/utils/insumo-conversao-ui';

type Props = {
  grupo: InsumoPendenciaProdutoGrupo;
  fator: number;
  unidadeInsumoLabel: string | null;
};

export default function InsumoPendenciaGrupoNfList({ grupo, fator, unidadeInsumoLabel }: Props) {
  const mostrarFornecedor = grupo.contexto.fornecedoresDistintos !== 1;
  const mostrarConversao = fator > 0 && Boolean(unidadeInsumoLabel);
  const ordenadas = [...grupo.pendencias].sort((a, b) =>
    (b.data_emissao_nf ?? '').localeCompare(a.data_emissao_nf ?? ''),
  );

  return (
    <div className="rounded-xl border border-stone-200 bg-white">
      <p className="border-b border-stone-100 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
        Notas fiscais ({grupo.nfsDistintas})
      </p>
      <ul className="divide-y divide-stone-100">
        {ordenadas.map((pendencia) => {
          const conversaoEstoque =
            mostrarConversao && unidadeInsumoLabel
              ? formatInsumoQuantidade(
                  calcularQuantidadeEntrada(Number(pendencia.quantidade_nf), fator),
                  formatUnidadeLabel(unidadeInsumoLabel, unidadeInsumoLabel),
                )
              : null;

          return (
            <li key={pendencia.id} className="px-4 py-3">
              <InsumoPendenciaNfDetalheItem
                pendencia={pendencia}
                unidadeNf={grupo.unidadeNf}
                mostrarFornecedor={mostrarFornecedor}
                conversaoEstoque={conversaoEstoque}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
