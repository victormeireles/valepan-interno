'use client';

import { useState, useEffect } from 'react';
import AutocompleteInput from './AutocompleteInput';

interface SelectRemoteAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  stage: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
}

export default function SelectRemoteAutocomplete({ 
  value, 
  onChange, 
  stage, 
  required = false, 
  disabled = false,
  placeholder = 'Digite para buscar...',
  label
}: SelectRemoteAutocompleteProps) {
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/options/${stage}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Falha ao carregar opções');
        }
        
        const data = await response.json();
        setOptions(data.options || []);
      } catch (err) {
        console.error('Erro ao carregar opções:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    fetchOptions();
  }, [stage]);

  if (loading) {
    return (
      <div className="w-full">
        <label className="block text-base font-semibold text-gray-800 mb-3">
          {label || 'Carregando opções...'} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg bg-gray-100 animate-pulse">
          <span className="text-gray-700 text-xl font-medium">Carregando...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <label className="block text-base font-semibold text-red-700 mb-3">
          {label || 'Erro ao carregar opções'} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="w-full px-4 py-4 border-2 border-red-300 rounded-lg bg-red-50">
          <span className="text-red-700 text-xl font-medium">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <AutocompleteInput
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      label={label || 'Selecione'}
    />
  );
}
