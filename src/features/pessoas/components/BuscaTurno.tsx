'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/Input';
import { TurnoBusca, type TurnoBuscaItem } from '@/domain/pessoas/turno-busca';

type Props = {
  name: string;
  label: string;
  turnos: TurnoBuscaItem[];
  atual?: string | null;
  atualCodigo?: string | null;
  valorInicial?: string | null;
  onChange: (codigo: string) => void;
};

export function BuscaTurno({ name, label, turnos, atual, atualCodigo, valorInicial, onChange }: Props) {
  const [termo, setTermo] = useState('');
  const [codigo, setCodigo] = useState(valorInicial ?? '');
  const [aberto, setAberto] = useState(false);
  const escolhido = turnos.find((turno) => turno.codigo === codigo);
  const lista = useMemo(() => new TurnoBusca().listar(turnos, termo), [turnos, termo]);

  function escolher(proximo: string) {
    setCodigo(proximo);
    onChange(proximo);
    setTermo('');
    setAberto(false);
  }

  return (
    <div className="flex flex-col gap-3">
      {atual ? (
        <p className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700">
          <span className="block text-xs font-medium uppercase tracking-wide text-stone-500">Atual</span>
          {atual}
        </p>
      ) : null}
      <div className="relative">
        <input type="hidden" name={name} value={codigo} />
        <Input
          label={label}
          required
          icon="search"
          value={aberto ? termo : rotulo(escolhido)}
          placeholder="Buscar setor ou turno"
          autoComplete="off"
          aria-expanded={aberto}
          onFocus={() => setAberto(true)}
          onBlur={() => window.setTimeout(() => setAberto(false), 150)}
          onChange={(event) => {
            setTermo(event.target.value);
            setAberto(true);
          }}
        />
        {aberto ? <ListaTurnos lista={lista} codigo={codigo} atualCodigo={atualCodigo} onEscolher={escolher} /> : null}
      </div>
    </div>
  );
}

function ListaTurnos({
  lista,
  codigo,
  atualCodigo,
  onEscolher,
}: {
  lista: TurnoBuscaItem[];
  codigo: string;
  atualCodigo?: string | null;
  onEscolher: (codigo: string) => void;
}) {
  return (
    <ul className="mt-2 max-h-64 overflow-auto rounded-xl border border-stone-200 bg-white">
      {lista.length === 0 ? <li className="px-3 py-3 text-sm text-stone-500">Nenhum turno encontrado.</li> : null}
      {lista.map((turno) => (
        <li key={turno.codigo}>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onEscolher(turno.codigo)}
            className={[
              'flex min-h-11 w-full items-center justify-between gap-2 px-3 text-left text-sm',
              codigo === turno.codigo ? 'bg-amber-100 text-amber-900' : 'text-stone-800 hover:bg-amber-50',
            ].join(' ')}
          >
            <span>{turno.setorNome} — {turno.nome}</span>
            {atualCodigo === turno.codigo ? <span className="text-xs text-stone-500">Atual</span> : null}
          </button>
        </li>
      ))}
    </ul>
  );
}

function rotulo(turno: TurnoBuscaItem | undefined): string {
  if (!turno) return '';
  return `${turno.setorNome} — ${turno.nome}`;
}
