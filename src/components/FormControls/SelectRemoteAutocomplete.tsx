'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import AutocompleteInput, { type AutocompleteEmptyCreateConfig } from './AutocompleteInput';

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
  emptyCreate?: AutocompleteEmptyCreateConfig;
  optionsRefreshKey?: number;
  /** Opção exibida enquanto a lista remota ainda não inclui o value selecionado. */
  pinnedOption?: Option | null;
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
  emptyCreate,
  optionsRefreshKey = 0,
  pinnedOption = null,
}: SelectRemoteAutocompleteProps) {
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState(() => {
    if (pinnedOption && value === pinnedOption.value) return pinnedOption.label;
    return '';
  });
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

  const resolvedOptions = useMemo(() => {
    if (!pinnedOption) return options;
    if (options.some((option) => option.value === pinnedOption.value)) return options;
    return [...options, pinnedOption];
  }, [options, pinnedOption]);

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
          const insumoExtraFields = Array.from(
            new Set(['custo_unitario', ...(extraFields ?? [])]),
          );
          const insumoExtraParam =
            insumoExtraFields.length > 0
              ? `&extraFields=${insumoExtraFields.join(',')}`
              : '';
          baseUrl = `/api/options/generic?table=insumos&labelField=nome${insumoExtraParam}`;
        } else {
          baseUrl = `/api/options/${stage}${extraParam}`;
        }

        const cacheBust = optionsRefreshKey > 0 ? `&_=${optionsRefreshKey}` : '';
        const url = `${field ? `/api/options/${stage}?field=${field}` : baseUrl}${cacheBust}`;

        const response = await fetch(url, { cache: 'no-store' });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Falha ao carregar opções');
        }
        
        const data = await response.json();
        const rawOptions = (data.options || []) as Option[];
        const enrichedOptions =
          stage === 'insumos'
            ? rawOptions.map((option) => {
                const codigo = option.meta?.unidadeCodigo;
                if (!codigo) return option;
                return {
                  ...option,
                  label: `${option.label} (${String(codigo).toUpperCase()})`,
                };
              })
            : rawOptions;
        setOptions(enrichedOptions);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido");
      } finally {
        setLoading(false);
      }
    };

    fetchOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, field, extraFieldsKey, optionsRefreshKey]);

  useEffect(() => {
    if (!value) {
      setSelectedOption(null);
      setInputValue("");
      onOptionSelectedRef.current?.(null);
      return;
    }

    const match =
      resolvedOptions.find((opt) => opt.value === value) ??
      (pinnedOption?.value === value ? pinnedOption : null);

    if (match) {
      setSelectedOption(match);
      setInputValue(match.label);
      onOptionSelectedRef.current?.(match);
    }
  }, [value, resolvedOptions, pinnedOption]);

  const handleSelect = (labelSelected: string) => {
    const option = resolveOptionFromLabel(labelSelected);
    setSelectedOption(option);
    setInputValue(option?.label ?? labelSelected);

    if (option) {
      onChange(option.value);
    } else {
      onChange("");
    }

    onOptionSelected?.(option);
  };

  const resolveOptionFromLabel = (label: string): Option | null => {
    const normalized = label.trim().toLowerCase();
    if (!normalized) return null;
    return resolvedOptions.find((opt) => opt.label.trim().toLowerCase() === normalized) ?? null;
  };

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);

    if (!newValue.trim()) {
      onChange("");
      setSelectedOption(null);
      onOptionSelected?.(null);
      return;
    }

    const matchedOption = resolveOptionFromLabel(newValue);
    if (matchedOption) {
      setSelectedOption(matchedOption);
      onChange(matchedOption.value);
      onOptionSelected?.(matchedOption);
      return;
    }

    onChange("");
    setSelectedOption(null);
    onOptionSelected?.(null);
  };

  if (loading) {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-1.5 block text-sm font-medium tracking-[-0.004em] text-stone-700">
            {label} {required && <span className="text-danger">*</span>}
          </label>
        )}
        <div className="h-[50px] w-full animate-pulse rounded-[9px] border border-border-default bg-stone-50" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-1.5 block text-sm font-medium text-danger">
            {label} {required && <span className="text-danger">*</span>}
          </label>
        )}
        <div className="w-full rounded-[9px] border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger-fg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <AutocompleteInput
      value={inputValue}
      onChange={handleInputChange}
      onSelect={handleSelect}
      options={resolvedOptions.map((o) => o.label)}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      label={label}
      strict={false}
      emptyCreate={emptyCreate}
    />
  );
}
