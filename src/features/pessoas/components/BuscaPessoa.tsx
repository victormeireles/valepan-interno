'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/Input';

export type BuscaOpcao = { id: string; nome: string; detalhe?: string };

type Props = {
  label: string;
  opcoes: BuscaOpcao[];
  value: string;
  onChange: (id: string) => void;
};

export function BuscaPessoa({ label, opcoes, value, onChange }: Props) {
  const [termo, setTermo] = useState('');
  const escolhida = opcoes.find((opcao) => opcao.id === value);
  const filtradas = useMemo(() => filtrar(opcoes, termo), [opcoes, termo]);

  return (
    <div className="relative flex flex-col gap-1.5">
      <Input
        label={label}
        value={escolhida ? escolhida.nome : termo}
        placeholder="Buscar pelo nome"
        icon="search"
        onChange={(event) => {
          setTermo(event.target.value);
          onChange('');
        }}
        autoComplete="off"
      />
      {termo && !value ? (
        <ul className="absolute top-full z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-stone-200 bg-white shadow-lg">
          {filtradas.length === 0 ? (
            <li className="px-3 py-3 text-sm text-stone-500">Nenhuma pessoa encontrada.</li>
          ) : (
            filtradas.map((opcao) => (
              <li key={opcao.id}>
                <button
                  type="button"
                  className="flex min-h-11 w-full flex-col items-start px-3 py-2 text-left hover:bg-amber-50"
                  onClick={() => {
                    onChange(opcao.id);
                    setTermo('');
                  }}
                >
                  <span className="text-sm text-stone-900">{opcao.nome}</span>
                  {opcao.detalhe ? <span className="font-mono text-xs text-stone-500">{opcao.detalhe}</span> : null}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

function filtrar(opcoes: BuscaOpcao[], termo: string): BuscaOpcao[] {
  const normalizado = termo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
  if (!normalizado) return opcoes.slice(0, 8);
  return opcoes
    .filter((opcao) => {
      const nome = opcao.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
      return nome.includes(normalizado) || (opcao.detalhe ?? '').toLocaleLowerCase('pt-BR').includes(normalizado);
    })
    .slice(0, 8);
}
