'use client';

import React, { useMemo } from 'react';
import type { StockFamilyGroup } from '../types';
import type { StockCardSelection } from '../types';
import { extractProductVariationLabel } from '@/domain/estoque/stock-grouping';
import {
  ProductStockRow,
  resolveStockQuantityColumns,
  getStockRowGridStyle,
} from './ProductStockRow';

interface StockFamilyCardProps {
  familia: StockFamilyGroup;
  estoqueNome: string;
  filterTerm?: string;
  onAdjustStock: (data: StockCardSelection) => void;
  onRegisterOutflow: (data: StockCardSelection) => void;
  onViewHistory: (data: StockCardSelection) => void;
}

export const StockFamilyCard: React.FC<StockFamilyCardProps> = ({
  familia,
  estoqueNome,
  filterTerm = '',
  onAdjustStock,
  onRegisterOutflow,
  onViewHistory,
}) => {
  const searchTerm = filterTerm.trim().toLowerCase();
  const produtoMatches = (nome: string) =>
    !searchTerm ||
    nome.toLowerCase().includes(searchTerm) ||
    familia.familiaNome.toLowerCase().includes(searchTerm);

  const columns = useMemo(
    () => resolveStockQuantityColumns(familia.produtos),
    [familia.produtos],
  );

  const gridStyle = useMemo(
    () => getStockRowGridStyle(columns),
    [columns],
  );

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm has-[[data-menu-open=true]]:relative has-[[data-menu-open=true]]:z-30">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-100">
        {familia.familiaImagemUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={familia.familiaImagemUrl}
            alt={familia.familiaNome}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0 grid place-items-center text-stone-300"
            style={{
              background:
                'radial-gradient(120% 100% at 50% 0%, var(--stone-50, #fafaf9), var(--stone-100, #f5f5f4))',
            }}
          >
            <span className="material-icons text-[3.25rem]" aria-hidden="true">
              bakery_dining
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-3.5 sm:p-4">
        <div className="flex items-center gap-2">
          <h3 className="min-w-0 flex-1 text-base font-bold leading-snug text-stone-900">
            {familia.familiaNome}
          </h3>
          <span className="shrink-0 font-mono text-[11px] tabular-nums text-stone-500">
            {familia.produtos.length} var.
          </span>
        </div>

        <div className="flex-1 overflow-visible rounded-xl border border-stone-100">
          <div
            className="grid items-center gap-x-2 rounded-t-xl border-b border-stone-100 bg-stone-50 px-3 py-1.5 sm:px-4"
            style={gridStyle}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
              Var.
            </span>
            {columns.cx && (
              <span className="text-right text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                Cx
              </span>
            )}
            {columns.pct && (
              <span className="text-right text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                Pct
              </span>
            )}
            {columns.un && (
              <span className="text-right text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                Un
              </span>
            )}
            {columns.kg && (
              <span className="text-right text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                Kg
              </span>
            )}
            <span className="sr-only">Ações</span>
          </div>

          <ul className="divide-y divide-stone-100">
            {familia.produtos.map((item) => {
              const variacao = extractProductVariationLabel(
                item.produto,
                familia.familiaNome,
              );

              return (
                <li key={item.produto}>
                  <ProductStockRow
                    label={variacao}
                    produto={item.produto}
                    quantidade={item.quantidade}
                    columns={columns}
                    gridStyle={gridStyle}
                    highlighted={produtoMatches(item.produto)}
                    onAdjust={() =>
                      onAdjustStock({
                        estoqueNome,
                        produto: item.produto,
                        quantidade: item.quantidade,
                        tipoEstoqueId: item.tipoEstoqueId,
                        produtoId: item.produtoId,
                      })
                    }
                    onOutflow={() =>
                      onRegisterOutflow({
                        estoqueNome,
                        produto: item.produto,
                        quantidade: item.quantidade,
                        tipoEstoqueId: item.tipoEstoqueId,
                        produtoId: item.produtoId,
                      })
                    }
                    onHistory={() =>
                      onViewHistory({
                        estoqueNome,
                        produto: item.produto,
                        quantidade: item.quantidade,
                        tipoEstoqueId: item.tipoEstoqueId,
                        produtoId: item.produtoId,
                      })
                    }
                  />
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </article>
  );
};
