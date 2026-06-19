'use client';

import { Input } from '@/components/ui/Input';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  label?: string;
}

export default function TextInput({
  value,
  onChange,
  placeholder = '',
  required = false,
  disabled = false,
  label = 'Campo',
}: TextInputProps) {
  return (
    <Input
      label={label}
      required={required}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}
