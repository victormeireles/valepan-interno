'use client';

import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { controlInputClassName } from '@/components/ui/input-class-name';
import type { StockTipoNode } from '../types';
import { StockTipoNav } from './StockTipoNav';

export interface StockDashboardToolbarProps {
  filterTerm: string;
  onFilterChange: (value: string) => void;
  tipos: StockTipoNode[];
  selectedTipoId: string | null;
  onSelectTipo: (id: string) => void;
  onNewStock: () => void;
  updatedAtLabel?: string | null;
  filterResultHint?: string | null;
}

export const StockDashboardToolbar: React.FC<StockDashboardToolbarProps> = ({
  filterTerm,
  onFilterChange,
  tipos,
  selectedTipoId,
  onSelectTipo,
  onNewStock,
  updatedAtLabel,
  filterResultHint,
}) => {
  const hasFilter = filterTerm.trim().length > 0;

  return (
    <header className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="material-icons text-[1.625rem] text-accent"
            aria-hidden="true"
          >
            inventory_2
          </span>
          <h1 className="text-2xl font-semibold tracking-[-0.015em] text-text-strong">
            Estoque
          </h1>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto sm:justify-end">
          <div className="relative min-w-0 flex-1 sm:w-56 sm:flex-none">
            <label htmlFor="stock-filter" className="sr-only">
              Buscar família ou produto
            </label>
            <span
              className="material-icons pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xl text-stone-400"
              aria-hidden="true"
            >
              search
            </span>
            <input
              id="stock-filter"
              type="search"
              value={filterTerm}
              onChange={(e) => onFilterChange(e.target.value)}
              placeholder="Buscar produto…"
              autoComplete="off"
              className={controlInputClassName({
                hasIcon: true,
                size: 'compact',
                fullWidth: true,
              })}
            />
            {hasFilter ? (
              <div className="absolute inset-y-0 right-0 flex items-center pr-0.5">
                <IconButton
                  icon="close"
                  label="Limpar filtro"
                  size="lg"
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  onClick={() => onFilterChange('')}
                />
              </div>
            ) : null}
          </div>

          {updatedAtLabel ? (
            <Badge tone="outline" icon="schedule">
              Atualizado {updatedAtLabel}
            </Badge>
          ) : null}

          <Button
            type="button"
            variant="primary"
            icon="add"
            className="shrink-0"
            onClick={onNewStock}
          >
            Novo estoque
          </Button>
        </div>
      </div>

      {tipos.length > 0 ? (
        <div className="mt-4 flex flex-col gap-2">
          <StockTipoNav
            tipos={tipos}
            selectedId={selectedTipoId}
            onSelect={onSelectTipo}
          />
          {filterResultHint ? (
            <p className="text-xs font-medium text-stone-500">{filterResultHint}</p>
          ) : null}
        </div>
      ) : null}
    </header>
  );
};
