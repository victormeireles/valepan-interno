'use client';

import { Input } from '@/components/ui/Input';

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  label?: string;
}

export default function DateInput({
  value,
  onChange,
  required = false,
  disabled = false,
  label = 'Data',
}: DateInputProps) {
  return (
    <Input
      label={label}
      required={required}
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    />
  );
}
