'use client';

import { Switch as UiSwitch } from '@/components/ui/Switch';

interface SwitchProps {
  value: boolean;
  onChange: (value: boolean) => void;
  required?: boolean;
  disabled?: boolean;
  label?: string;
  trueLabel?: string;
  falseLabel?: string;
}

export default function Switch({
  value,
  onChange,
  required = false,
  disabled = false,
  label = 'Congelado',
  trueLabel = 'Sim',
  falseLabel = 'Não',
}: SwitchProps) {
  return (
    <div className="w-full">
      <label className="mb-3 block text-sm font-medium tracking-[-0.004em] text-stone-700">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      <UiSwitch
        checked={value}
        onChange={onChange}
        disabled={disabled}
        label={value ? trueLabel : falseLabel}
      />
    </div>
  );
}
