'use client';

import { useState } from 'react';
import { parseColagemPlanilha } from '@/domain/receitas/receita-planilha-parser';
import type { ReceitaPlanilhaLinhaParseada } from '@/domain/receitas/receita-planilha-types';

type Props = {
  onContinue: (linhas: ReceitaPlanilhaLinhaParseada[]) => void;
  onCancel: () => void;
};

const PLACEHOLDER = `Cole aqui (nome + tab + quantidade):

Farinha especial\t0,3
Açúcar\t1
Sal\t0,5`;

export default function ReceitaColarPlanilhaStep({ onContinue, onCancel }: Props) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleContinue = () => {
    try {
      setError(null);
      onContinue(parseColagemPlanilha(text));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Texto inválido');
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-600">
        Cole da planilha: uma linha por ingrediente, com tab ou espaços entre nome e quantidade.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        placeholder={PLACEHOLDER}
        className="w-full rounded-xl border-2 border-stone-200 px-4 py-3 text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
      />
      {error && (
        <p className="text-sm text-rose-600 flex items-center gap-1">
          <span className="material-icons text-sm" aria-hidden>
            error
          </span>
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-3 rounded-xl border-2 border-stone-100 text-stone-700 font-semibold hover:bg-stone-50 transition-colors"
        >
          Voltar
        </button>
        <button
          type="button"
          onClick={handleContinue}
          className="flex-[2] px-4 py-3 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-700 transition-colors"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
