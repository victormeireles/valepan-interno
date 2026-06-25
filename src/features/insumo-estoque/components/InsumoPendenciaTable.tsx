'use client';

import type { InsumoPendenciaProdutoGrupo } from '@/domain/insumos/insumo-pendencia-grupo';
import { Button } from '@/components/ui/Button';
import OrdemProducaoRowCheckbox from '@/components/OrdensProducao/OrdemProducaoRowCheckbox';
import {
  configTableBodyCellClass,
  configTableHeadCellClass,
} from '@/components/Config/config-table-styles';
import InsumoPendenciaFornecedorCell from '@/features/insumo-estoque/components/InsumoPendenciaFornecedorCell';
import InsumoPendenciaNfsPopover from '@/features/insumo-estoque/components/InsumoPendenciaNfsPopover';
import InsumoPendenciaProdutoMeta from '@/features/insumo-estoque/components/InsumoPendenciaProdutoMeta';
import {
  formatCurrency,
  formatDateTime,
  formatInsumoQuantidade,
} from '@/features/insumo-estoque/utils/formatters';
import { getGrupoIgnoradoEm } from '@/domain/insumos/insumo-pendencia-grupo';

type Props = {
  grupos: InsumoPendenciaProdutoGrupo[];
  selectedKeys: Set<string>;
  onToggleSelect: (chave: string) => void;
  onToggleSelectAll: () => void;
  allVisibleSelected: boolean;
  someVisibleSelected: boolean;
  onVincular: (grupo: InsumoPendenciaProdutoGrupo) => void;
  onIgnorar?: (grupo: InsumoPendenciaProdutoGrupo) => void;
  onRestaurar?: (grupo: InsumoPendenciaProdutoGrupo) => void;
  variant?: 'pendente' | 'ignorado';
  embedded?: boolean;
};

export default function InsumoPendenciaTable({
  grupos,
  selectedKeys,
  onToggleSelect,
  onToggleSelectAll,
  allVisibleSelected,
  someVisibleSelected,
  onVincular,
  onIgnorar,
  onRestaurar,
  variant = 'pendente',
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
            <th scope="col" className={`${configTableHeadCellClass} w-12 text-left`}>
              <OrdemProducaoRowCheckbox
                checked={allVisibleSelected}
                onChange={onToggleSelectAll}
                ariaLabel="Selecionar todos os produtos visíveis"
                className={someVisibleSelected && !allVisibleSelected ? 'opacity-60' : ''}
              />
            </th>
            <th scope="col" className={`${configTableHeadCellClass} text-left`}>
              <span className="uppercase tracking-wide text-[11px] font-semibold text-stone-500">
                Produto Omie
              </span>
            </th>
            <th scope="col" className={`${configTableHeadCellClass} text-right`}>
              <span className="uppercase tracking-wide text-[11px] font-semibold text-stone-500">
                Qtd NF
              </span>
            </th>
            <th scope="col" className={`${configTableHeadCellClass} text-right`}>
              <span className="uppercase tracking-wide text-[11px] font-semibold text-stone-500">
                NFs
              </span>
            </th>
            <th scope="col" className={`${configTableHeadCellClass} text-left`}>
              <span className="uppercase tracking-wide text-[11px] font-semibold text-stone-500">
                Fornecedor
              </span>
            </th>
            <th scope="col" className={`${configTableHeadCellClass} text-right`}>
              <span className="uppercase tracking-wide text-[11px] font-semibold text-stone-500">
                Valor
              </span>
            </th>
            {variant === 'ignorado' ? (
              <th scope="col" className={`${configTableHeadCellClass} text-right`}>
                <span className="uppercase tracking-wide text-[11px] font-semibold text-stone-500">
                  Ignorado em
                </span>
              </th>
            ) : null}
            <th scope="col" className={`${configTableHeadCellClass} text-right`}>
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {grupos.map((grupo, index) => {
            const selected = selectedKeys.has(grupo.chave);
            return (
              <tr
                key={grupo.chave}
                className={[
                  index % 2 === 1 ? 'bg-stone-50/60' : 'bg-white',
                  selected ? 'bg-amber-50/70' : '',
                  'transition-colors hover:bg-amber-50/40',
                ].join(' ')}
              >
                <td className={configTableBodyCellClass}>
                  <OrdemProducaoRowCheckbox
                    checked={selected}
                    onChange={() => onToggleSelect(grupo.chave)}
                    ariaLabel={`Selecionar ${grupo.descricaoProduto || grupo.omieIdProduto}`}
                  />
                </td>
                <td className={`${configTableBodyCellClass} max-w-xs text-stone-800`}>
                  <div className="font-mono text-xs text-stone-500">
                    {grupo.omieCodigoProduto || grupo.omieIdProduto}
                  </div>
                  <div className="mt-0.5 font-medium text-stone-900">
                    {grupo.descricaoProduto || '—'}
                  </div>
                  <InsumoPendenciaProdutoMeta grupo={grupo} />
                </td>
                <td className={`${configTableBodyCellClass} text-right font-mono tabular-nums text-stone-800`}>
                  {formatInsumoQuantidade(grupo.quantidadeNfTotal, grupo.unidadeNf ?? undefined)}
                </td>
                <td className={`${configTableBodyCellClass} text-right`}>
                  <InsumoPendenciaNfsPopover grupo={grupo} />
                </td>
                <td className={`${configTableBodyCellClass} max-w-[12rem]`}>
                  <InsumoPendenciaFornecedorCell
                    empresaNome={grupo.empresaNome}
                    contexto={grupo.contexto}
                  />
                </td>
                <td className={`${configTableBodyCellClass} text-right font-mono tabular-nums text-stone-700`}>
                  {formatCurrency(grupo.valorTotal)}
                </td>
                {variant === 'ignorado' ? (
                  <td className={`${configTableBodyCellClass} text-right font-mono text-xs tabular-nums text-stone-600`}>
                    {formatDateTime(getGrupoIgnoradoEm(grupo))}
                  </td>
                ) : null}
                <td className={`${configTableBodyCellClass} text-right`}>
                  <div className="inline-flex flex-wrap justify-end gap-2">
                    <Button size="sm" onClick={() => onVincular(grupo)}>
                      Vincular
                    </Button>
                    {variant === 'ignorado' ? (
                      <Button size="sm" variant="ghost" onClick={() => onRestaurar?.(grupo)}>
                        Restaurar
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => onIgnorar?.(grupo)}>
                        Ignorar
                      </Button>
                    )}
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

