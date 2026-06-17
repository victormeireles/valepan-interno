'use client';

import { useEffect, useRef, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { OrdemProducaoPainelItem } from '@/domain/types/ordens-producao-painel';
import { formatISODateBrNoYear } from '@/lib/utils/date-utils';
import OrdemProducaoAssadeiraCell from '@/components/OrdensProducao/OrdemProducaoAssadeiraCell';
import {
  ordensProducaoListGridClass,
} from '@/components/OrdensProducao/ordens-producao-list-layout';
import {
  ordensProducaoEtiquetaBadgeClass,
  ordensProducaoRowClass,
} from '@/components/OrdensProducao/ordens-producao-theme';

type OrdemProducaoRowProps = {
  ordem: OrdemProducaoPainelItem;
  filterDate: string;
  isFirst: boolean;
  isLast: boolean;
  onEdit: (ordem: OrdemProducaoPainelItem) => void;
  onDelete: (ordem: OrdemProducaoPainelItem) => void;
  onMoveUp: (ordem: OrdemProducaoPainelItem) => void;
  onMoveDown: (ordem: OrdemProducaoPainelItem) => void;
};

export default function OrdemProducaoRow({
  ordem,
  filterDate,
  isFirst,
  isLast,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: OrdemProducaoRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ordem.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const etiquetaDiffers = ordem.dataEtiqueta !== filterDate;
  const observacaoDisplay = ordem.observacao.trim() || '—';

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${ordensProducaoRowClass} grid grid-cols-[auto_1fr_auto] gap-x-2 gap-y-1 ${ordensProducaoListGridClass} ${
        isDragging ? 'relative z-10 bg-white shadow-lg ring-1 ring-amber-200/80' : ''
      }`}
    >
      <button
        type="button"
        className="row-span-2 flex h-11 w-8 shrink-0 cursor-grab items-center justify-center self-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600 active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 md:row-span-1"
        aria-label={`Reordenar ordem ${ordem.ordemPlanejamento}`}
        {...attributes}
        {...listeners}
      >
        <span className="material-icons text-xl" aria-hidden="true">
          drag_indicator
        </span>
      </button>

      <span className="hidden w-7 self-center text-center text-sm font-semibold tabular-nums text-stone-500 md:block">
        {ordem.ordemPlanejamento}
      </span>

      <span className="hidden self-center truncate text-sm font-medium text-stone-600 md:block">
        {ordem.tipoEstoque}
      </span>

      <button
        type="button"
        onClick={() => onEdit(ordem)}
        className="col-start-2 min-w-0 self-center text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-md md:col-start-auto"
      >
        <span className="flex items-baseline gap-2">
          <span className="text-xs font-semibold tabular-nums text-stone-400 md:hidden">
            {ordem.ordemPlanejamento}.
          </span>
          <span className="block truncate font-semibold text-stone-900">{ordem.produto}</span>
        </span>
        <span className="mt-0.5 block truncate text-xs text-stone-500 md:hidden">
          {ordem.tipoEstoque} • {ordem.quantidadeLabel}
        </span>
      </button>

      <div className="hidden self-center md:block">
        <OrdemProducaoAssadeiraCell
          variant={ordem.assadeiraVariant}
          nome={ordem.assadeiraNome}
        />
      </div>

      <span className="hidden self-center text-right text-sm font-medium tabular-nums text-stone-800 md:block">
        {ordem.quantidadeLabel}
      </span>

      <div className="hidden items-center justify-center gap-1 self-center md:flex">
        <span className="text-sm tabular-nums text-stone-600">
          {formatISODateBrNoYear(ordem.dataEtiqueta)}
        </span>
        {etiquetaDiffers ? (
          <span className={ordensProducaoEtiquetaBadgeClass} title="Data etiqueta diferente da produção">
            ≠
          </span>
        ) : null}
      </div>

      <span
        className="hidden self-center truncate text-sm text-stone-500 xl:block"
        title={ordem.observacao.trim() || undefined}
      >
        {observacaoDisplay}
      </span>

      <div className="relative col-start-3 row-start-1 flex items-center self-center md:col-start-auto md:row-start-auto" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          aria-label="Ações da ordem"
          aria-expanded={menuOpen}
        >
          <span className="material-icons" aria-hidden="true">
            more_vert
          </span>
        </button>

        {menuOpen ? (
          <div
            role="menu"
            className="absolute right-0 top-full z-20 mt-1 min-w-[180px] rounded-xl border border-stone-200 bg-white py-1 shadow-lg"
          >
            <MenuButton
              icon="edit"
              label="Editar"
              onClick={() => {
                setMenuOpen(false);
                onEdit(ordem);
              }}
            />
            <MenuButton
              icon="keyboard_arrow_up"
              label="Mover para cima"
              disabled={isFirst}
              onClick={() => {
                setMenuOpen(false);
                onMoveUp(ordem);
              }}
            />
            <MenuButton
              icon="keyboard_arrow_down"
              label="Mover para baixo"
              disabled={isLast}
              onClick={() => {
                setMenuOpen(false);
                onMoveDown(ordem);
              }}
            />
            <MenuButton
              icon="delete"
              label="Excluir"
              tone="danger"
              onClick={() => {
                setMenuOpen(false);
                onDelete(ordem);
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MenuButton({
  icon,
  label,
  onClick,
  disabled = false,
  tone = 'default',
}: {
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'default' | 'danger';
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm disabled:cursor-not-allowed disabled:opacity-40 ${
        tone === 'danger'
          ? 'text-red-700 hover:bg-red-50'
          : 'text-stone-700 hover:bg-stone-50'
      }`}
    >
      <span className="material-icons text-base" aria-hidden="true">
        {icon}
      </span>
      {label}
    </button>
  );
}
