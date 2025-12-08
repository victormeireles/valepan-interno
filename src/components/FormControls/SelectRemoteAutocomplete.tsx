'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import AutocompleteInput from './AutocompleteInput';

interface Option {
  label: string;
  value: string;
  meta?: Record<string, unknown>;
}

interface SelectRemoteAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  stage: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
  field?: string;
  extraFields?: string[];
  onOptionSelected?: (option: Option | null) => void;
}

export default function SelectRemoteAutocomplete({
  value,
  onChange,
  stage,
  required = false,
  disabled = false,
  placeholder = "Digite para buscar...",
  label,
  field,
  extraFields,
  onOptionSelected,
}: SelectRemoteAutocompleteProps) {
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);
  
  // Usar useRef para onOptionSelected para evitar re-renders infinitos
  const onOptionSelectedRef = useRef(onOptionSelected);
  useEffect(() => {
    onOptionSelectedRef.current = onOptionSelected;
  }, [onOptionSelected]);

  // Serializar extraFields para usar como dependência estável
  const extraFieldsKey = useMemo(() => {
    return extraFields ? extraFields.join(',') : '';
  }, [extraFields]);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const extraParam =
          extraFields && extraFields.length
            ? `&extraFields=${extraFields.join(",")}`
            : "";

        let baseUrl: string;
        if (stage === "produtos") {
          baseUrl = `/api/options/generic?table=produtos&labelField=nome${extraParam}`;
        } else if (stage === "unidades") {
          baseUrl = `/api/options/generic?table=unidades&labelField=nome_resumido${extraParam}`;
        } else if (stage === "insumos") {
          baseUrl = `/api/options/generic?table=insumos&labelField=nome${extraParam}`;
        } else {
          baseUrl = `/api/options/${stage}${extraParam}`;
        }

        const url = field ? `/api/options/${stage}?field=${field}` : baseUrl;
        
        const response = await fetch(url);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Falha ao carregar opções');
        }
        
        const data = await response.json();
        setOptions((data.options || []) as Option[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido");
      } finally {
        setLoading(false);
      }
    };

    fetchOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, field, extraFieldsKey]);

  useEffect(() => {
    if (!value) {
      setSelectedOption(null);
      setInputValue("");
      onOptionSelectedRef.current?.(null);
      return;
    }

    const match = options.find((opt) => opt.value === value);
    if (match) {
      setSelectedOption(match);
      setInputValue(match.label);
      onOptionSelectedRef.current?.(match);
    }
  }, [value, options]);

  const handleSelect = (labelSelected: string) => {
    const option = options.find((opt) => opt.label === labelSelected) ?? null;
    setSelectedOption(option);
    setInputValue(option?.label ?? labelSelected);

    if (option) {
      onChange(option.value);
    } else {
      onChange("");
    }

    onOptionSelected?.(option);
  };

  if (loading) {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl bg-gray-50 animate-pulse h-[50px]">
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-semibold text-red-700 mb-1.5">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div className="w-full px-4 py-3 border-2 border-red-100 rounded-xl bg-red-50 text-red-600 text-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <AutocompleteInput
      value={inputValue}
      onChange={(newValue) => {
        setInputValue(newValue);
        if (!newValue) {
          onChange("");
          setSelectedOption(null);
          onOptionSelected?.(null);
        }
      }}
      onSelect={handleSelect}
      options={options.map((o) => o.label)}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      label={label}
      strict={false}
    />
  );
}
