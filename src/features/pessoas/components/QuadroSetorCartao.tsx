'use client';

import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { HorarioSemana } from '@/domain/pessoas/horario-semana';
import type { QuadroSetor, QuadroTurno } from '@/domain/pessoas/quadro-agrupamento';
import { QuadroTotais } from '@/domain/pessoas/quadro-totais';
import { QuadroContagem } from './QuadroContagem';

type Props = {
  setor: QuadroSetor;
  podeEditar: boolean;
  onNovoTurno: () => void;
  onEditarTurno: (turno: QuadroTurno) => void;
  onAbrirTurno: (turnoCodigo: string) => void;
};

export function QuadroSetorCartao({ setor, podeEditar, onNovoTurno, onEditarTurno, onAbrirTurno }: Props) {
  const totais = new QuadroTotais();
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
      <header className="mb-3 flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-stone-900">{setor.setorNome}</h2>
            <p className="text-sm text-stone-600">{setor.liderNome ? `Líder: ${setor.liderNome}` : 'Sem líder cadastrado'}</p>
          </div>
          {podeEditar ? (
            <Button type="button" variant="secondary" size="lg" icon="add" fullWidth className="sm:w-auto" onClick={onNovoTurno}>
              Novo turno
            </Button>
          ) : null}
        </div>
        <QuadroContagem numeros={totais.doSetor(setor, 'total')} densidade="setor" />
      </header>
      {setor.turnos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-3 py-4 text-sm text-stone-600">
          Nenhum turno neste setor.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {setor.turnos.map((item) => (
            <TurnoCartao
              key={item.turnoCodigo}
              item={item}
              numeros={totais.doTurno(item, 'total')}
              podeEditar={podeEditar}
              onAbrir={() => onAbrirTurno(item.turnoCodigo)}
              onEditar={() => onEditarTurno(item)}
            />
          ))}
        </div>
      )}
      {setor.apoio.length > 0 ? (
        <p className="mt-3 break-words text-sm text-stone-600">
          Apoio: {setor.apoio.map((pessoaApoio) => pessoaApoio.nome).join(', ')}
        </p>
      ) : null}
    </section>
  );
}

function TurnoCartao({
  item,
  numeros,
  podeEditar,
  onAbrir,
  onEditar,
}: {
  item: QuadroTurno;
  numeros: { aprovado: number; contratados: number; reservas: number; livres: number };
  podeEditar: boolean;
  onAbrir: () => void;
  onEditar: () => void;
}) {
  return (
    <article className="rounded-xl border border-stone-200 transition hover:border-amber-300 hover:bg-amber-50">
      <div className="flex items-start justify-between gap-2 p-3 pb-0">
        <button type="button" className="min-h-11 min-w-0 flex-1 text-left" onClick={onAbrir}>
          <span className="block truncate text-sm font-medium text-stone-900">{item.turnoNome}</span>
          {item.liderNome ? (
            <span className="mt-1 block truncate text-xs font-medium text-amber-800">Líder: {item.liderNome}</span>
          ) : null}
          {new HorarioSemana().resumir(item.horario).map((linha) => (
            <span key={linha} className="mt-0.5 block font-mono text-xs tabular-nums text-stone-600">
              {linha}
            </span>
          ))}
        </button>
        {podeEditar ? (
          <IconButton icon="schedule" label={`Alterar horário de ${item.turnoNome}`} size="lg" onClick={onEditar} />
        ) : null}
      </div>
      <button type="button" className="w-full p-3 text-left" onClick={onAbrir}>
        <Barra numeros={numeros} />
        <span className="mt-2 grid grid-cols-4 gap-1 text-center sm:gap-2">
          <Metrica rotulo="Aprovadas" curto="Aprov." valor={numeros.aprovado} />
          <Metrica rotulo="Contratados" curto="Contr." valor={numeros.contratados} />
          <Metrica rotulo="A entrar" curto="Entrar" valor={numeros.reservas} />
          <Metrica rotulo="Livres" curto="Livres" valor={numeros.livres} />
        </span>
      </button>
    </article>
  );
}

function Barra({ numeros }: { numeros: { aprovado: number; contratados: number; reservas: number } }) {
  const total = Math.max(numeros.aprovado, 1);
  return (
    <span className="mt-3 flex h-2 overflow-hidden rounded-full bg-stone-100" aria-hidden>
      <span className="bg-amber-600" style={{ width: `${(numeros.contratados / total) * 100}%` }} />
      <span className="bg-amber-300" style={{ width: `${(numeros.reservas / total) * 100}%` }} />
    </span>
  );
}

function Metrica({ rotulo, curto, valor }: { rotulo: string; curto: string; valor: number }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-stone-500">
        <span className="sm:hidden">{curto}</span>
        <span className="hidden sm:inline">{rotulo}</span>
      </span>
      <span className="font-mono text-base tabular-nums text-stone-900 sm:text-lg">{valor.toLocaleString('pt-BR')}</span>
    </span>
  );
}
