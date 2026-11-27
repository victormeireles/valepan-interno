'use client';

import { Badge } from '@/components/ui/Badge';
import type { SetorEdicaoItem, SetorTipo } from '@/domain/pessoas/setor-edicao';

type Props = {
  setores: SetorEdicaoItem[];
  onEditar: (setor: SetorEdicaoItem) => void;
};

const linha =
  'flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl border border-stone-200 bg-white px-3 py-2 text-left shadow-sm transition-[background,border-color,box-shadow] duration-150 ease-out hover:border-amber-300 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 active:bg-amber-100 touch-manipulation';

export function QuadroSetorEdicaoLista({ setores, onEditar }: Props) {
  if (setores.length === 0) {
    return <p className="text-sm text-stone-600">Nenhum setor ativo para editar.</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-normal text-stone-600">Escolha um setor para alterar o nome ou o tipo.</p>
      <p className="font-mono text-sm tabular-nums text-stone-500">{rotuloContagem(setores.length)}</p>
      <ul className="flex flex-col gap-2">
        {setores.map((setor) => (
          <li key={setor.codigo}>
            <button type="button" className={linha} aria-label={`Editar ${setor.nome}, ${rotuloTipo(setor.tipo)}`} onClick={() => onEditar(setor)}>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-stone-900">{setor.nome}</span>
                <span className="font-mono text-xs tabular-nums text-stone-500">{setor.codigo}</span>
              </span>
              <Badge tone={setor.tipo === 'apoio' ? 'outline' : 'accent'}>{rotuloTipo(setor.tipo)}</Badge>
              <span className="material-icons text-[22px] text-stone-500" aria-hidden>
                edit
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function rotuloContagem(quantidade: number): string {
  const numero = quantidade.toLocaleString('pt-BR');
  return quantidade === 1 ? `${numero} setor` : `${numero} setores`;
}

function rotuloTipo(tipo: SetorTipo): string {
  return tipo === 'apoio' ? 'Apoio' : 'Operacional';
}
