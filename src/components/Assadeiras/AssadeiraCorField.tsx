'use client';

import { AssadeiraCor, assadeiraCor } from '@/domain/assadeiras/assadeira-cor';

type AssadeiraCorFieldProps = {
  value: string;
  onChange: (hex: string) => void;
  error?: string;
};

export default function AssadeiraCorField({
  value,
  onChange,
  error,
}: AssadeiraCorFieldProps) {
  const hex = assadeiraCor.normalize(value);
  const visual = assadeiraCor.visual(hex);

  return (
    <div className="space-y-1.5">
      <label htmlFor="assadeira-cor" className="text-sm font-semibold text-gray-700 ml-1">
        Cor <span className="text-red-500">*</span>
      </label>
      <p className="text-xs text-gray-500 ml-1">
        Mesma cor no fluxo, nas OPs e na produção.
      </p>
      <div className="flex flex-wrap gap-2 ml-1">
        {AssadeiraCor.SUGESTOES.map((sugestao) => {
          const selected = hex === sugestao;
          return (
            <button
              key={sugestao}
              type="button"
              onClick={() => onChange(sugestao)}
              className={`h-11 w-11 rounded-xl border-2 transition-all ${
                selected ? 'border-gray-900 scale-105' : 'border-transparent hover:border-gray-300'
              }`}
              style={{ background: sugestao }}
              aria-label={`Usar cor ${sugestao}`}
              aria-pressed={selected}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-3">
        <input
          id="assadeira-cor"
          type="color"
          value={hex}
          onChange={(e) => onChange(assadeiraCor.normalize(e.target.value))}
          className="h-11 w-14 cursor-pointer rounded-xl border-2 border-gray-100 bg-gray-50 p-1"
          aria-label="Selecionar cor"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder="#C6A848"
          spellCheck={false}
          className="min-h-11 flex-1 px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-gray-900 font-mono font-medium uppercase tracking-wide focus:outline-none focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all"
          aria-invalid={Boolean(error)}
        />
        <span
          className="inline-flex h-11 min-w-11 items-center justify-center rounded-xl border px-3 font-mono text-xs font-semibold"
          style={visual.pill}
          aria-hidden="true"
        >
          Aa
        </span>
      </div>
      {error ? (
        <p role="alert" className="text-xs text-rose-600 ml-1">
          {error}
        </p>
      ) : null}
    </div>
  );
}
