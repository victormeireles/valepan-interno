'use client';

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  required?: boolean;
  disabled?: boolean;
  label: string;
  min?: number;
  step?: number;
}

export default function NumberInput({ 
  value, 
  onChange, 
  required = false, 
  disabled = false, 
  label,
  min = 0,
  step = 1
}: NumberInputProps) {
  return (
    <div className="w-full">
      <label className="block text-base font-semibold text-gray-800 mb-3">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        required={required}
        disabled={disabled}
        min={min}
        step={step}
        className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xl font-medium bg-white text-gray-900"
      />
    </div>
  );
}
