'use client';

import SelectRemoteAutocomplete from '@/components/FormControls/SelectRemoteAutocomplete';

type Props = {
  conversaoUnidadeId: string;
  conversaoFator: string;
  unidadeResumida: string;
  onConversaoUnidadeIdChange: (value: string) => void;
  onConversaoFatorChange: (value: string) => void;
};

export default function InsumoConversaoCadastroFields({
  conversaoUnidadeId,
  conversaoFator,
  unidadeResumida,
  onConversaoUnidadeIdChange,
  onConversaoFatorChange,
}: Props) {
  return (
    <div className="space-y-3 rounded-xl border border-stone-200 bg-stone-50/60 p-4">
      <div>
        <p className="text-sm font-semibold text-stone-800">Unidade de conferência</p>
        <p className="mt-0.5 text-xs text-stone-500">
          Opcional. Ex.: bobina em UN enquanto o estoque fica em kg.
        </p>
      </div>
      <SelectRemoteAutocomplete
        value={conversaoUnidadeId}
        onChange={(value) => {
          onConversaoUnidadeIdChange(value);
          if (!value) onConversaoFatorChange('');
        }}
        stage="unidades"
        label="Unidade de conferência"
        placeholder="Nenhuma (só unidade oficial)"
      />
      <div className="space-y-1.5">
        <label
          htmlFor="conversao-fator"
          className="ml-1 text-sm font-semibold text-gray-700"
        >
          1 {conversaoUnidadeId ? 'unidade de conferência' : 'UN'} equivale a
        </label>
        <div className="flex items-center gap-2">
          <input
            id="conversao-fator"
            type="number"
            min="0"
            step="any"
            value={conversaoFator}
            onChange={(e) => onConversaoFatorChange(e.target.value)}
            disabled={!conversaoUnidadeId}
            className="w-full rounded-xl border-2 border-gray-100 bg-white px-4 py-3 font-mono tabular-nums text-gray-900 transition-all focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-500/10 disabled:bg-stone-100 disabled:text-stone-400"
            placeholder="Ex.: 5,2"
          />
          <span className="shrink-0 font-mono text-sm tabular-nums text-stone-600">
            {unidadeResumida || 'un. oficial'}
          </span>
        </div>
      </div>
    </div>
  );
}
