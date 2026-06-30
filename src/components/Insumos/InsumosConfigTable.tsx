'use client';

import type { Insumo } from '@/app/actions/insumos-actions';
import type { InsumoReceitaAssociacao } from '@/domain/receitas/insumo-receita-associacao';
import type { IntegracaoInsumoComEmpresa } from '@/domain/types/insumo-estoque-db';
import ConfigAtivoBadge from '@/components/Config/ConfigAtivoBadge';
import InsumoReceitasButton from '@/components/Insumos/InsumoReceitasButton';
import InsumoVinculosOmieButton from '@/components/Insumos/InsumoVinculosOmieButton';
import ConfigSortIcon from '@/components/Config/ConfigSortIcon';
import {
  configSortButtonClass,
  configTableBodyCellClass,
  configTableHeadCellClass,
  configTableRowClass,
} from '@/components/Config/config-table-styles';

export type InsumoSortKey = 'nome' | 'unidade' | 'custo_unitario' | 'ativo';

type Props = {
  items: Insumo[];
  receitasPorInsumo: Record<string, InsumoReceitaAssociacao[]>;
  vinculosOmiePorInsumo: Record<string, IntegracaoInsumoComEmpresa[]>;
  sortKey: InsumoSortKey;
  sortDir: 'asc' | 'desc';
  onSort: (key: InsumoSortKey) => void;
  onRowClick: (item: Insumo) => void;
  embedded?: boolean;
};

function sortAriaValue(key: InsumoSortKey, activeKey: InsumoSortKey, dir: 'asc' | 'desc') {
  if (key !== activeKey) return 'none' as const;
  return dir === 'asc' ? ('ascending' as const) : ('descending' as const);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function unidadeLabel(insumo: Insumo) {
  return insumo.unidades?.nome_resumido || insumo.unidades?.nome || '—';
}

export default function InsumosConfigTable({
  items,
  receitasPorInsumo,
  vinculosOmiePorInsumo,
  sortKey,
  sortDir,
  onSort,
  onRowClick,
  embedded = false,
}: Props) {
  const headers: { key: InsumoSortKey | null; label: string; align?: 'left' | 'right' }[] = [
    { key: 'nome', label: 'Nome' },
    { key: 'unidade', label: 'Unidade' },
    { key: 'custo_unitario', label: 'Custo unitário', align: 'right' },
    { key: null, label: 'Receitas', align: 'right' },
    { key: null, label: 'Omie', align: 'right' },
    { key: 'ativo', label: 'Status' },
  ];

  const wrapperClassName = embedded
    ? 'hidden md:block overflow-x-auto'
    : 'hidden md:block overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm';

  return (
    <div className={wrapperClassName}>
      <table className="w-full border-collapse text-sm">
        <thead className="border-b border-stone-200 bg-surface-sunken">
          <tr>
            {headers.map(({ key, label, align = 'left' }) => (
              <th
                key={label}
                scope="col"
                className={`${configTableHeadCellClass} ${align === 'right' ? 'text-right' : 'text-left'}`}
                aria-sort={key ? sortAriaValue(key, sortKey, sortDir) : undefined}
              >
                {key ? (
                  <button
                    type="button"
                    onClick={() => onSort(key)}
                    className={`${configSortButtonClass} ${align === 'right' ? 'ml-auto' : ''}`}
                  >
                    {label}
                    <ConfigSortIcon active={sortKey === key} dir={sortDir} />
                  </button>
                ) : (
                  <span className="uppercase tracking-wide text-[11px] font-semibold text-stone-500">
                    {label}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {items.map((item, index) => (
            <tr
              key={item.id}
              tabIndex={0}
              onClick={() => onRowClick(item)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onRowClick(item);
                }
              }}
              className={configTableRowClass(index, !item.ativo)}
            >
              <td className={`${configTableBodyCellClass} font-medium text-stone-900`}>
                {item.nome}
              </td>
              <td className={`${configTableBodyCellClass} text-stone-600`}>
                {unidadeLabel(item)}
              </td>
              <td className={`${configTableBodyCellClass} text-right font-mono tabular-nums text-stone-700`}>
                {formatCurrency(item.custo_unitario)}
              </td>
              <td className={`${configTableBodyCellClass} text-right`}>
                <InsumoReceitasButton
                  insumoNome={item.nome}
                  receitas={receitasPorInsumo[item.id] ?? []}
                />
              </td>
              <td className={`${configTableBodyCellClass} text-right`}>
                <InsumoVinculosOmieButton
                  insumoNome={item.nome}
                  vinculos={vinculosOmiePorInsumo[item.id] ?? []}
                />
              </td>
              <td className={configTableBodyCellClass}>
                <ConfigAtivoBadge ativo={item.ativo} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
