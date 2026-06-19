'use client';

import type { InsumoPendenciaComEmpresa } from '@/domain/types/insumo-estoque-db';
import { Button } from '@/components/ui/Button';
import {
  configTableBodyCellClass,
  configTableHeadCellClass,
} from '@/components/Config/config-table-styles';
import {
  formatCurrency,
  formatDate,
  formatInsumoQuantidade,
} from '@/features/insumo-estoque/utils/formatters';

type Props = {
  items: InsumoPendenciaComEmpresa[];
  onVincular: (item: InsumoPendenciaComEmpresa) => void;
  onIgnorar: (item: InsumoPendenciaComEmpresa) => void;
  embedded?: boolean;
};

export default function InsumoPendenciaTable({
  items,
  onVincular,
  onIgnorar,
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
                NF
              </span>
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
                Valor
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
          {items.map((item, index) => (
            <tr
              key={item.id}
              className={[
                index % 2 === 1 ? 'bg-stone-50/60' : 'bg-white',
                'transition-colors hover:bg-amber-50/40',
              ].join(' ')}
            >
              <td className={`${configTableBodyCellClass} text-stone-800`}>
                <div className="font-medium">{item.numero_nf || '—'}</div>
                <div className="text-xs text-stone-500">{formatDate(item.data_emissao_nf)}</div>
              </td>
              <td className={`${configTableBodyCellClass} text-stone-800`}>
                <div className="font-mono text-xs text-stone-500">
                  {item.omie_codigo_produto || item.omie_id_produto}
                </div>
                <div className="mt-0.5">{item.descricao_produto || '—'}</div>
              </td>
              <td className={`${configTableBodyCellClass} text-right font-mono tabular-nums text-stone-800`}>
                {formatInsumoQuantidade(Number(item.quantidade_nf), item.unidade_nf ?? undefined)}
              </td>
              <td className={`${configTableBodyCellClass} text-right font-mono tabular-nums text-stone-700`}>
                {formatCurrency(Number(item.valor_total_item))}
              </td>
              <td className={`${configTableBodyCellClass} text-stone-700`}>
                {item.empresaNome || '—'}
              </td>
              <td className={`${configTableBodyCellClass} text-right`}>
                <div className="inline-flex flex-wrap justify-end gap-2">
                  <Button size="sm" onClick={() => onVincular(item)}>
                    Vincular
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onIgnorar(item)}>
                    Ignorar
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
