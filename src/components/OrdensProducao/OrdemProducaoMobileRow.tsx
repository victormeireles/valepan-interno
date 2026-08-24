'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CSSProperties } from 'react';
import OrdemProducaoAssadeiraCell from '@/components/OrdensProducao/OrdemProducaoAssadeiraCell';
import { ordemAssadeiraVisual } from '@/components/OrdensProducao/ordem-assadeira-visual';
import OrdemProducaoDragHandle from '@/components/OrdensProducao/OrdemProducaoDragHandle';
import OrdemProducaoRowCheckbox from '@/components/OrdensProducao/OrdemProducaoRowCheckbox';
import OrdemProducaoRowMenu from '@/components/OrdensProducao/OrdemProducaoRowMenu';
import { buildOrdemMobileDetails } from '@/components/OrdensProducao/ordem-producao-meta';
import type { OrdemProducaoRowBaseProps } from '@/components/OrdensProducao/ordem-producao-row-types';
import { ordensProducaoEtiquetaBadgeClass, ordensProducaoRowClass } from '@/components/OrdensProducao/ordens-producao-theme';
import OrdemProducaoEstimativaLine from '@/components/OrdensProducao/OrdemProducaoEstimativaLine';

export default function OrdemProducaoMobileRow({
  ordem,
  filterDate,
  isFirst,
  isLast,
  selected,
  onToggleSelect,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onMoveToTop,
  onMoveToBottom,
}: OrdemProducaoRowBaseProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ordem.id });

  const visual = ordemAssadeiraVisual.resolve(ordem.assadeiraVariant, ordem.assadeiraCorHex);
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...(visual?.cssVar ?? {}),
  } as CSSProperties;

  const latasValue =
    ordem.modoQuantidade === 'latas' && ordem.assadeiras > 0 ? ordem.assadeiras : null;
  const caixasValue = ordem.caixas > 0 ? ordem.caixas : null;
  const etiquetaDiffers = ordem.dataEtiqueta !== filterDate;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${ordensProducaoRowClass} grid grid-cols-[auto_auto_1fr_auto] gap-x-2 gap-y-1 px-3 ${ordemAssadeiraVisual.resolveRailClass(
        ordem.assadeiraVariant,
      )} ${
        isDragging ? 'relative z-10 bg-surface shadow-[0_12px_24px_-6px_rgb(28_25_23/0.18)] ring-1 ring-amber-200/80' : ''
      } ${selected ? 'bg-amber-50/80 odd:bg-amber-50/80 even:bg-amber-50/80' : ''}`}
    >
      <div className="row-span-2 flex items-center self-center">
        <OrdemProducaoRowCheckbox
          checked={selected}
          onChange={() => onToggleSelect(ordem)}
          ariaLabel={`Selecionar ordem ${ordem.ordemPlanejamento}`}
        />
      </div>

      <OrdemProducaoDragHandle
        ordemPlanejamento={ordem.ordemPlanejamento}
        attributes={attributes}
        listeners={listeners}
        className="row-span-2 h-11 w-10 shrink-0 self-center"
      />

      <button
        type="button"
        onClick={() => onEdit(ordem)}
        className="col-start-3 min-w-0 self-center text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-[9px]"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-stone-400">
            {ordem.ordemPlanejamento}
          </span>
          {ordem.assadeiraVariant !== 'sem' ? (
            <span className="min-w-0 max-w-[9rem] shrink-0">
              <OrdemProducaoAssadeiraCell
                variant={ordem.assadeiraVariant}
                nome={ordem.assadeiraNome}
                corHex={ordem.assadeiraCorHex}
              />
            </span>
          ) : null}
          <span className="min-w-0 truncate font-semibold tracking-[-0.004em] text-text-strong">
            {ordem.produto}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-xs text-text-muted">
          {buildOrdemMobileDetails(ordem)}
          {ordem.criadoPorNome ? ` • ${ordem.criadoPorNome}` : ''}
          {etiquetaDiffers ? (
            <>
              {' '}
              <span className={ordensProducaoEtiquetaBadgeClass} title="Data etiqueta diferente da produção">
                ≠
              </span>
            </>
          ) : null}
        </span>
        {ordem.observacao.trim() ? (
          <span className="mt-0.5 block truncate text-xs italic text-stone-500" title={ordem.observacao}>
            {ordem.observacao}
          </span>
        ) : null}
        <OrdemProducaoEstimativaLine estimativa={ordem.estimativa} />
        <span className="mt-1 block font-mono text-xs tabular-nums text-stone-600">
          {latasValue != null ? `${latasValue.toLocaleString('pt-BR')} LT` : '— LT'}
          {' • '}
          {caixasValue != null ? `${caixasValue.toLocaleString('pt-BR')} CX` : '— CX'}
          {' • '}
          <span className="font-semibold text-text-strong">
            {ordem.unidades.toLocaleString('pt-BR')} UN
          </span>
        </span>
      </button>

      <div className="col-start-4 row-span-2 self-center">
        <OrdemProducaoRowMenu
          isFirst={isFirst}
          isLast={isLast}
          onEdit={() => onEdit(ordem)}
          onDelete={() => onDelete(ordem)}
          onMoveUp={() => onMoveUp(ordem)}
          onMoveDown={() => onMoveDown(ordem)}
          onMoveToTop={() => onMoveToTop(ordem)}
          onMoveToBottom={() => onMoveToBottom(ordem)}
        />
      </div>
    </div>
  );
}
