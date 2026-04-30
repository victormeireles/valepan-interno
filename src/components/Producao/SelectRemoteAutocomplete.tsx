'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getProdutoAutocompleteOptionById,
  searchProdutosParaAutocomplete,
  type ProdutoAutocompleteOption,
} from '@/app/actions/producao-actions';

export type RemoteAutocompleteStage = 'produtos';

export interface SelectRemoteAutocompleteProps {
  value: string;
  onChange: (id: string) => void;
  stage: RemoteAutocompleteStage;
  label?: string;
  placeholder?: string;
  extraFields?: string[];
  onOptionSelected?: (option: ProdutoAutocompleteOption | null) => void;
  disabled?: boolean;
}

const DEBOUNCE_MS = 280;

export default function SelectRemoteAutocomplete({
  value,
  onChange,
  stage,
  label = 'Seleção',
  placeholder = 'Buscar…',
  extraFields: _extraFields,
  onOptionSelected,
  disabled = false,
}: SelectRemoteAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<ProdutoAutocompleteOption[]>([]);
  const [selected, setSelected] = useState<ProdutoAutocompleteOption | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const resolveSelectionLabel = useCallback(async (id: string) => {
    if (!id) {
      setSelected(null);
      setQuery('');
      return;
    }
    setLoading(true);
    try {
      const r = await getProdutoAutocompleteOptionById(id);
      if (r.success && r.option) {
        setSelected(r.option);
        setQuery(r.option.label);
      } else {
        setSelected(null);
        setQuery(id ? `ID: ${id.slice(0, 8)}…` : '');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (stage !== 'produtos') return;
    void resolveSelectionLabel(value);
  }, [stage, value, resolveSelectionLabel]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const runSearch = useCallback(async (q: string) => {
    if (stage !== 'produtos') return;
    setLoading(true);
    setListError(null);
    try {
      const r = await searchProdutosParaAutocomplete(q);
      if (!r.success) {
        setOptions([]);
        setListError('error' in r ? (r.error ?? 'Erro ao buscar.') : 'Erro ao buscar.');
        return;
      }
      setOptions(r.options);
    } finally {
      setLoading(false);
    }
  }, [stage]);

  const scheduleSearch = useCallback(
    (q: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        void runSearch(q);
      }, DEBOUNCE_MS);
    },
    [runSearch],
  );

  const pick = (opt: ProdutoAutocompleteOption) => {
    setSelected(opt);
    setQuery(opt.label);
    onChange(opt.id);
    onOptionSelected?.(opt);
    setOpen(false);
    setOptions([]);
  };

  const clear = () => {
    setSelected(null);
    setQuery('');
    onChange('');
    onOptionSelected?.(null);
    setOptions([]);
    setOpen(false);
  };

  if (stage !== 'produtos') {
    return (
      <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        Autocomplete não suportado para o estágio «{stage}».
      </p>
    );
  }

  return (
    <div ref={containerRef} className="w-full relative">
      {label ? <span className="sr-only">{label}</span> : null}
      <div className="relative">
        <input
          type="text"
          autoComplete="off"
          disabled={disabled}
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            const t = e.target.value;
            setQuery(t);
            setOpen(true);
            scheduleSearch(t);
          }}
          onFocus={() => {
            setOpen(true);
            if (options.length === 0) {
              void runSearch(query);
            }
          }}
          className={`w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-gray-900 font-medium focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all ${value ? 'pr-16' : ''}`}
        />
        {value ? (
          <button
            type="button"
            disabled={disabled}
            onClick={clear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-800 px-2 py-1 rounded-lg hover:bg-gray-100"
          >
            Limpar
          </button>
        ) : null}
      </div>

      {open && (loading || options.length > 0 || listError) ? (
        <ul
          className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg py-1 text-left"
          role="listbox"
        >
          {listError ? (
            <li className="px-3 py-2 text-sm text-rose-600">{listError}</li>
          ) : null}
          {loading && options.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-500">A buscar…</li>
          ) : null}
          {options.map((opt) => (
            <li key={opt.id}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 text-gray-900"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(opt)}
              >
                {opt.label}
              </button>
            </li>
          ))}
          {!loading && !listError && options.length === 0 && query.trim().length >= 1 ? (
            <li className="px-3 py-2 text-sm text-gray-500">Nenhum produto encontrado.</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
