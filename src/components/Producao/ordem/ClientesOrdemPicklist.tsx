'use client';

import { useId, useMemo, useState } from 'react';
import type { ClienteOrdemProducaoOpcao } from '@/app/actions/producao-actions';

type Props = {
  opcoes: ClienteOrdemProducaoOpcao[];
  value: string[];
  onChange: (nomes: string[]) => void;
  disabled?: boolean;
  /** Lista compacta (ex.: célula da grelha). */
  compact?: boolean;
  /** Permite selecionar apenas um cliente (substitui em vez de acumular). */
  single?: boolean;
};

export default function ClientesOrdemPicklist({
  opcoes,
  value,
  onChange,
  disabled,
  compact,
  single,
}: Props) {
  const [q, setQ] = useState('');
  const radioGroupName = useId();
  const nomePorLower = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of opcoes) {
      m.set(o.nomeFantasia.toLowerCase(), o.nomeFantasia);
    }
    return m;
  }, [opcoes]);
  const nomesCatalogo = useMemo(() => new Set(opcoes.map((o) => o.nomeFantasia)), [opcoes]);
  const selecionados = useMemo(() => new Set(value), [value]);

  const legacy = useMemo(
    () => value.filter((n) => n.trim() !== '' && !nomesCatalogo.has(n)),
    [value, nomesCatalogo],
  );

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return opcoes;
    return opcoes.filter((c) => c.nomeFantasia.toLowerCase().includes(t));
  }, [opcoes, q]);

  const toggle = (nomeCanon: string) => {
    if (disabled) return;
    const n = nomeCanon.trim();
    if (!n) return;
    if (selecionados.has(n)) {
      onChange(value.filter((x) => x !== n));
    } else if (single) {
      onChange([n]);
    } else {
      onChange([...value, n]);
    }
  };

  const removeLegacy = (nome: string) => {
    if (disabled) return;
    onChange(value.filter((x) => x !== nome));
  };

  return (
    <div className="w-full space-y-1.5">
      {legacy.length > 0 && (
        <ul className="flex flex-wrap gap-1" aria-label="Clientes fora do cadastro atual">
          {legacy.map((nome) => (
            <li
              key={`legacy:${nome}`}
              className="inline-flex max-w-full items-center gap-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-950"
            >
              <span className="truncate" title={nome}>
                {nome}
              </span>
              <button
                type="button"
                disabled={disabled}
                className="shrink-0 rounded px-0.5 font-bold leading-none hover:bg-amber-200/80 disabled:opacity-50"
                onClick={() => removeLegacy(nome)}
                aria-label={`Remover ${nome}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        type="search"
        className={
          compact
            ? 'w-full rounded border border-slate-300 px-1.5 py-1 text-[10px] text-slate-900 placeholder:text-slate-400'
            : 'w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-900 placeholder:text-slate-400'
        }
        placeholder="Filtrar…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        disabled={disabled}
      />
      <div
        className={
          compact
            ? 'max-h-28 overflow-y-auto rounded border border-slate-200 bg-slate-50/60 px-1.5 py-1'
            : 'max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/80 px-2 py-1.5'
        }
      >
        {filtrados.length === 0 ? (
          <p className={compact ? 'py-0.5 text-[10px] text-slate-500' : 'py-1 text-xs text-slate-500'}>
            Sem resultados.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {filtrados.map((c) => {
              const canon = nomePorLower.get(c.nomeFantasia.toLowerCase()) ?? c.nomeFantasia;
              return (
                <li key={c.id}>
                  <label
                    className={
                      compact
                        ? 'flex cursor-pointer items-center gap-1.5 rounded px-0.5 py-0.5 text-[10px] font-medium text-slate-900 hover:bg-white'
                        : 'flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-xs font-medium text-slate-900 hover:bg-white'
                    }
                  >
                    <input
                      type={single ? 'radio' : 'checkbox'}
                      name={single ? radioGroupName : undefined}
                      checked={selecionados.has(canon)}
                      onChange={() => toggle(canon)}
                      onClick={() => {
                        if (single && selecionados.has(canon)) toggle(canon);
                      }}
                      disabled={disabled}
                    />
                    <span className="min-w-0 truncate text-slate-900">{c.nomeFantasia}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
