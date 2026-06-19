'use client';

import { useState, useEffect } from 'react';
import { Select } from '@/components/ui/Select';

interface SelectRemoteProps {
  value: string;
  onChange: (value: string) => void;
  stage: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export default function SelectRemote({
  value,
  onChange,
  stage,
  required = false,
  disabled = false,
  placeholder = 'Selecione...',
}: SelectRemoteProps) {
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
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    fetchOptions();
  }, [stage]);

  if (loading) {
    return (
      <Select label="Carregando opções..." disabled>
        <option>Carregando...</option>
      </Select>
    );
  }

  if (error) {
    return <Select label="Erro ao carregar opções" error={error} disabled />;
  }

  return (
    <Select
      label={placeholder}
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </Select>
  );
}
