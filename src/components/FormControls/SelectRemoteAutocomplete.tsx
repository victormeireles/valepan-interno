'use client';

import { useState, useEffect } from 'react';
import AutocompleteInput from './AutocompleteInput';

interface Option {
  label: string;
  value: string;
}

interface SelectRemoteAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  stage: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
  field?: string; // campo específico para buscar opções
}

export default function SelectRemoteAutocomplete({ 
  value, 
  onChange, 
  stage, 
  required = false, 
  disabled = false,
  placeholder = 'Digite para buscar...',
  label,
  field
}: SelectRemoteAutocompleteProps) {
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const url = field 
          ? `/api/options/${stage}?field=${field}` 
          : (stage === 'produtos' ? '/api/options/generic?table=produtos&labelField=nome' : `/api/options/${stage}`);
        
        const response = await fetch(url);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Falha ao carregar opções');
        }
        
        const data = await response.json();
        // Ensure options are in the correct format { label, value }
        const formattedOptions = (data.options || []).map((opt: string | Option) => {
          if (typeof opt === 'string') return { label: opt, value: opt };
          return opt;
        });
        setOptions(formattedOptions);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    fetchOptions();
  }, [stage, field]);

  if (loading) {
    return (
      <div className="w-full">
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          {label || 'Carregando opções...'} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl bg-gray-50 animate-pulse h-[50px]">
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <label className="block text-sm font-semibold text-red-700 mb-1.5">
          {label || 'Erro ao carregar opções'} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="w-full px-4 py-3 border-2 border-red-100 rounded-xl bg-red-50 text-red-600 text-sm">
          {error}
        </div>
      </div>
    );
  }

  // Encontrar o label do valor atual para exibir no input
  const currentOption = options.find(opt => opt.value === value);
  const displayValue = currentOption ? currentOption.label : value;

  return (
    <AutocompleteInput
      value={displayValue}
      onChange={(newValue) => {
        // Se o usuário digitar, tentamos achar se bate com algum label
        const matchedOption = options.find(opt => opt.label === newValue);
        onChange(matchedOption ? matchedOption.value : newValue);
      }}
      onSelect={(selectedValue) => {
        // Quando seleciona da lista, recebemos o label
        const option = options.find(opt => opt.label === selectedValue);
        if (option) onChange(option.value);
      }}
      options={options.map(o => o.label)}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      label={label || 'Selecione'}
    />
  );
}
