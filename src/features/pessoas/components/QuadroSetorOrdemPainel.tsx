'use client';

import { useEffect, useState } from 'react';
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { reordenarSetores } from '@/app/actions/pessoas-setor-actions';
import { IconButton } from '@/components/ui/IconButton';
import type { QuadroSetor } from '@/domain/pessoas/quadro-agrupamento';
import { PainelAcao } from './PainelAcao';

type Props = {
  aberto: boolean;
  setores: QuadroSetor[];
  onFechar: () => void;
  onConcluir: (mensagem: string, ok: boolean) => void;
};

export function QuadroSetorOrdemPainel({ aberto, setores, onFechar, onConcluir }: Props) {
  if (!aberto) return null;
  return <Formulario setores={setores} onFechar={onFechar} onConcluir={onConcluir} />;
}

function Formulario({
  setores,
  onFechar,
  onConcluir,
}: {
  setores: QuadroSetor[];
  onFechar: () => void;
  onConcluir: Props['onConcluir'];
}) {
  const [lista, setLista] = useState(setores);
  const [pendente, setPendente] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    setLista(setores);
  }, [setores]);

  async function persistir(proxima: QuadroSetor[]) {
    setLista(proxima);
    setPendente(true);
    const resultado = await reordenarSetores(proxima.map((setor) => setor.setorCodigo));
    setPendente(false);
    onConcluir(resultado.ok ? 'Ordem atualizada.' : resultado.mensagem, resultado.ok);
    if (!resultado.ok) setLista(setores);
  }

  function aoSoltar(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || pendente) return;
    const de = lista.findIndex((setor) => setor.setorCodigo === active.id);
    const para = lista.findIndex((setor) => setor.setorCodigo === over.id);
    if (de < 0 || para < 0) return;
    void persistir(arrayMove(lista, de, para));
  }

  function mover(indice: number, destino: number) {
    if (pendente || destino < 0 || destino >= lista.length) return;
    void persistir(arrayMove(lista, indice, destino));
  }

  return (
    <PainelAcao aberto titulo="Ordem dos setores" onFechar={onFechar}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-stone-600">
          Arraste pelo indicador ou use as setas. A ordem define como o quadro aparece.
        </p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={aoSoltar}>
          <SortableContext items={lista.map((setor) => setor.setorCodigo)} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col gap-1">
              {lista.map((setor, indice) => (
                <LinhaSetor
                  key={setor.setorCodigo}
                  setor={setor}
                  indice={indice}
                  total={lista.length}
                  pendente={pendente}
                  onSubir={() => mover(indice, indice - 1)}
                  onDescer={() => mover(indice, indice + 1)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </div>
    </PainelAcao>
  );
}

function LinhaSetor({
  setor,
  indice,
  total,
  pendente,
  onSubir,
  onDescer,
}: {
  setor: QuadroSetor;
  indice: number;
  total: number;
  pendente: boolean;
  onSubir: () => void;
  onDescer: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: setor.setorCodigo,
    disabled: pendente,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={[
        'flex min-h-11 items-center gap-1 rounded-xl border border-stone-200 bg-white px-1 py-1',
        isDragging ? 'z-10 border-amber-300 shadow-md' : '',
        indice % 2 === 1 ? 'bg-stone-50' : '',
      ].join(' ')}
    >
      <button
        type="button"
        className="flex min-h-11 min-w-11 touch-none cursor-grab items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600 active:cursor-grabbing disabled:opacity-40"
        aria-label={`Arrastar ${setor.setorNome}`}
        disabled={pendente}
        {...attributes}
        {...listeners}
      >
        <span className="material-icons text-[22px]" aria-hidden>
          drag_indicator
        </span>
      </button>
      <div className="min-w-0 flex-1 px-1">
        <p className="truncate text-sm font-medium text-stone-900">{setor.setorNome}</p>
        <p className="font-mono text-xs tabular-nums text-stone-500">
          {(indice + 1).toLocaleString('pt-BR')} · {setor.setorCodigo}
        </p>
      </div>
      <IconButton icon="keyboard_arrow_up" label={`Subir ${setor.setorNome}`} size="lg" disabled={pendente || indice === 0} onClick={onSubir} />
      <IconButton icon="keyboard_arrow_down" label={`Descer ${setor.setorNome}`} size="lg" disabled={pendente || indice === total - 1} onClick={onDescer} />
    </li>
  );
}
