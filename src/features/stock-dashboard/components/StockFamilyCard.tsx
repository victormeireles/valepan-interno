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
    !searchTerm || nome.toLowerCase().includes(searchTerm);

  const columns = useMemo(
    () => resolveStockQuantityColumns(familia.produtos),
    [familia.produtos],
  );

  const gridStyle = useMemo(
    () => getStockRowGridStyle(columns),
    [columns],
  );

  return (
    <article className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white shadow-sm has-[[data-menu-open=true]]:relative has-[[data-menu-open=true]]:z-30">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-2xl bg-gray-100">
        {familia.familiaImagemUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={familia.familiaImagemUrl}
            alt={familia.familiaNome}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-300">
            <span className="material-icons text-5xl" aria-hidden>
              bakery_dining
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <h3 className="text-sm font-bold leading-snug text-gray-900 sm:text-base">
          {familia.familiaNome}
        </h3>

        <div className="mt-3 flex-1 overflow-visible rounded-xl border border-gray-100">
          <div
            className="grid items-center gap-x-2 border-b border-gray-100 bg-gray-50/80 px-3 py-1.5 sm:px-4"
            style={gridStyle}
          >
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Var.
            </span>
            {columns.cx && (
              <span className="text-right text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Cx
              </span>
            )}
            {columns.pct && (
              <span className="text-right text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Pct
              </span>
            )}
            {columns.un && (
              <span className="text-right text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Un
              </span>
            )}
            {columns.kg && (
              <span className="text-right text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Kg
              </span>
            )}
            <span className="sr-only">Ações</span>
          </div>

          <ul className="divide-y divide-gray-100">
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
