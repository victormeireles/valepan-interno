'use client';

import { useEffect, useRef, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { OrdemProducaoPainelItem } from '@/domain/types/ordens-producao-painel';
import { formatISODateBrNoYear } from '@/lib/utils/date-utils';
import { ordensProducaoEtiquetaBadgeClass } from '@/components/OrdensProducao/ordens-producao-theme';

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
      className={`group grid grid-cols-[auto_auto_1fr_auto] md:grid-cols-[auto_auto_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto_auto_auto] items-center gap-2 md:gap-3 border-b border-stone-100 px-3 py-2.5 last:border-b-0 hover:bg-stone-50/80 ${
        isDragging ? 'relative z-10 bg-white shadow-lg opacity-90' : ''
      }`}
    >
      <button
        type="button"
        className="flex h-11 w-8 shrink-0 cursor-grab items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600 active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        aria-label={`Reordenar ordem ${ordem.ordemPlanejamento}`}
        {...attributes}
        {...listeners}
      >
        <span className="material-icons text-xl" aria-hidden="true">
          drag_indicator
        </span>
      </button>

      <span className="w-6 text-center text-sm font-semibold tabular-nums text-stone-500">
        {ordem.ordemPlanejamento}
      </span>

      <button
        type="button"
        onClick={() => onEdit(ordem)}
        className="min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-md"
      >
        <span className="block truncate font-semibold text-stone-900">{ordem.produto}</span>
        <span className="mt-0.5 block truncate text-xs text-stone-500 md:hidden">
          {ordem.tipoEstoque} • {ordem.quantidadeLabel}
        </span>
      </button>

      <span className="hidden truncate text-sm text-stone-600 md:block">{ordem.tipoEstoque}</span>

      <span className="hidden text-sm tabular-nums text-stone-700 lg:block">
        {ordem.quantidadeLabel}
      </span>

      <div className="hidden md:flex items-center gap-1.5">
        <span className="text-sm tabular-nums text-stone-600">
          {formatISODateBrNoYear(ordem.dataEtiqueta)}
        </span>
        {etiquetaDiffers ? (
          <span className={ordensProducaoEtiquetaBadgeClass} title="Data etiqueta diferente da produção">
            ≠ prod.
          </span>
        ) : null}
      </div>

      <span
        className="hidden xl:block max-w-[140px] truncate text-sm text-stone-500"
        title={ordem.observacao.trim() || undefined}
      >
        {observacaoDisplay}
      </span>

      <div className="relative flex items-center gap-0.5" ref={menuRef}>
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
