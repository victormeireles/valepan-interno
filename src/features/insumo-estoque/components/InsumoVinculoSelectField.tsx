'use client';

import { useState } from 'react';
import SelectRemoteAutocomplete from '@/components/FormControls/SelectRemoteAutocomplete';
import InsumoCriarInlinePanel from '@/features/insumo-estoque/components/InsumoCriarInlinePanel';
import type { InsumoSelecionadoResumo } from '@/features/insumo-estoque/utils/insumo-conversao-ui';

type AutocompleteOption = {
  label: string;
  value: string;
  meta?: Record<string, unknown>;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  onOptionSelected?: (option: AutocompleteOption | null) => void;
  nomeSugeridoOmie?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
};

export default function InsumoVinculoSelectField({
  value,
  onChange,
  onOptionSelected,
  nomeSugeridoOmie = '',
  label = 'Insumo no estoque',
  placeholder = 'Buscar insumo...',
  required = false,
  disabled = false,
}: Props) {
  const [modoCriar, setModoCriar] = useState(false);
  const [nomeCriar, setNomeCriar] = useState('');
  const [optionsRefreshKey, setOptionsRefreshKey] = useState(0);
  const [pinnedOption, setPinnedOption] = useState<AutocompleteOption | null>(null);

  const abrirCriar = (query?: string) => {
    const sugestao = query?.trim() || nomeSugeridoOmie.trim();
    setNomeCriar(sugestao);
    setModoCriar(true);
  };

  const handleCreated = (insumo: InsumoSelecionadoResumo) => {
    const unidadeLabel = insumo.unidadeCodigo || insumo.unidadeNome;
    const optionLabel = unidadeLabel ? `${insumo.nome} (${unidadeLabel.toUpperCase()})` : insumo.nome;
    const createdOption: AutocompleteOption = {
      label: optionLabel,
      value: insumo.id,
      meta: {
        unidadeCodigo: insumo.unidadeCodigo,
        unidadeNomeResumido: insumo.unidadeNome,
      },
    };

    setPinnedOption(createdOption);
    setOptionsRefreshKey((key) => key + 1);
    setModoCriar(false);
    onChange(insumo.id);
    onOptionSelected?.(createdOption);
  };

  const handleInsumoChange = (nextValue: string) => {
    if (!nextValue) setPinnedOption(null);
    onChange(nextValue);
  };

  const handleInsumoSelected = (option: AutocompleteOption | null) => {
    if (option && option.value !== pinnedOption?.value) {
      setPinnedOption(null);
    }
    onOptionSelected?.(option);
  };

  if (modoCriar) {
    return (
      <InsumoCriarInlinePanel
        nomeInicial={nomeCriar}
        onCreated={handleCreated}
        onCancel={() => setModoCriar(false)}
      />
    );
  }

  return (
    <div className="space-y-2">
      <SelectRemoteAutocomplete
        value={value}
        onChange={handleInsumoChange}
        onOptionSelected={handleInsumoSelected}
        stage="insumos"
        label={label}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        optionsRefreshKey={optionsRefreshKey}
        pinnedOption={pinnedOption}
        emptyCreate={{
          minQueryLength: 2,
          actionLabel: 'Criar insumo com este nome',
          onAction: abrirCriar,
        }}
      />
      <button
        type="button"
        onClick={() => abrirCriar()}
        disabled={disabled}
        className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-amber-800 hover:text-amber-900 disabled:opacity-50"
      >
        <span className="material-icons text-base" aria-hidden="true">
          add
        </span>
        Não encontrou? Criar insumo
      </button>
    </div>
  );
}
