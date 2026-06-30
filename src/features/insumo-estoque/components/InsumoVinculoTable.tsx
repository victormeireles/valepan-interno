'use client';

import type { IntegracaoInsumoListItem } from '@/domain/types/insumo-estoque-db';
import { Button } from '@/components/ui/Button';
import {
  configTableBodyCellClass,
  configTableHeadCellClass,
} from '@/components/Config/config-table-styles';
import { formatUnidadeLabel } from '@/features/insumo-estoque/utils/insumo-conversao-ui';
import { formatValorUnitarioNf } from '@/features/insumo-estoque/utils/formatters';
import InsumoPendenciaFornecedorCell from '@/features/insumo-estoque/components/InsumoPendenciaFornecedorCell';
import InsumoPendenciaNfsButton from '@/features/insumo-estoque/components/InsumoPendenciaNfsButton';
import InsumoProdutoOmieHeader from '@/features/insumo-estoque/components/InsumoProdutoOmieHeader';
import { buildNfsTargetFromVinculo } from '@/features/insumo-estoque/utils/insumo-pendencia-nfs-target';

type Props = {
  items: IntegracaoInsumoListItem[];
  onEditar: (item: IntegracaoInsumoListItem) => void;
  onExcluir: (item: IntegracaoInsumoListItem) => void;
  embedded?: boolean;
};

function formatFator(value: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  });
}

export default function InsumoVinculoTable({
  items,
  onEditar,
  onExcluir,
  embedded = false,
}: Props) {
  const wrapperClassName = embedded
    ? 'hidden md:block overflow-x-auto'
    : 'hidden md:block overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm';

  return (
    <div className={wrapperClassName}>
      <table className="w-full border-collapse text-sm">
        <thead className="border-b border-stone-200 bg-surface-sunken">
          <tr>
            <th scope="col" className={`${configTableHeadCellClass} text-left`}>
              <span className="uppercase tracking-wide text-[11px] font-semibold text-stone-500">
                Produto Omie
              </span>
            </th>
            <th scope="col" className={`${configTableHeadCellClass} text-left`}>
              <span className="uppercase tracking-wide text-[11px] font-semibold text-stone-500">
                Insumo
              </span>
            </th>
            <th scope="col" className={`${configTableHeadCellClass} text-left`}>
              <span className="uppercase tracking-wide text-[11px] font-semibold text-stone-500">
                Fornecedor
              </span>
            </th>
            <th scope="col" className={`${configTableHeadCellClass} text-right`}>
              <span className="uppercase tracking-wide text-[11px] font-semibold text-stone-500">
                NFs
              </span>
            </th>
            <th scope="col" className={`${configTableHeadCellClass} text-right`}>
              <span className="uppercase tracking-wide text-[11px] font-semibold text-stone-500">
                Vl. unit.
              </span>
            </th>
            <th scope="col" className={`${configTableHeadCellClass} text-right`}>
              <span className="uppercase tracking-wide text-[11px] font-semibold text-stone-500">
                Fator
              </span>
            </th>
            <th scope="col" className={`${configTableHeadCellClass} text-left`}>
              <span className="uppercase tracking-wide text-[11px] font-semibold text-stone-500">
                Empresa
              </span>
            </th>
            <th scope="col" className={`${configTableHeadCellClass} text-right`}>
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {items.map((item, index) => {
            const unidadeLabel = formatUnidadeLabel(
              item.insumoUnidadeCodigo,
              item.insumoUnidadeNome,
            );

            return (
              <tr
                key={item.id}
                className={[
                  index % 2 === 1 ? 'bg-stone-50/60' : 'bg-white',
                  'transition-colors hover:bg-amber-50/40',
                ].join(' ')}
              >
                <td className={`${configTableBodyCellClass} text-stone-800`}>
                  <InsumoProdutoOmieHeader
                    categoriaTitulo={item.contexto.categoriaTitulo}
                    categoriaSubtitulo={item.contexto.categoriaSubtitulo}
                  />
                  <div className="mt-0.5">{item.descricao_omie || '—'}</div>
                </td>
                <td className={`${configTableBodyCellClass} text-stone-800`}>
                  <div>{item.insumoNome || '—'}</div>
                  {unidadeLabel ? (
                    <div className="mt-0.5 font-mono text-xs text-stone-500">{unidadeLabel}</div>
                  ) : null}
                </td>
                <td className={`${configTableBodyCellClass} max-w-[12rem]`}>
                  <InsumoPendenciaFornecedorCell
                    empresaNome={item.empresaNome}
                    contexto={item.contexto}
                    showEmpresa={false}
                  />
                </td>
                <td className={`${configTableBodyCellClass} text-right`}>
                  <InsumoPendenciaNfsButton target={buildNfsTargetFromVinculo(item)} />
                </td>
                <td className={`${configTableBodyCellClass} text-right font-mono text-xs tabular-nums text-stone-700`}>
                  {formatValorUnitarioNf(item.valorUnitarioNf, item.unidadeNf)}
                </td>
                <td className={`${configTableBodyCellClass} text-right font-mono tabular-nums text-stone-800`}>
                  {formatFator(Number(item.fator_conversao))}
                </td>
                <td className={`${configTableBodyCellClass} text-stone-700`}>
                  {item.empresaNome || '—'}
                </td>
                <td className={`${configTableBodyCellClass} text-right`}>
                  <div className="inline-flex flex-wrap justify-end gap-2">
                    <Button size="sm" variant="secondary" onClick={() => onEditar(item)}>
                      Editar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onExcluir(item)}>
                      Excluir
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
