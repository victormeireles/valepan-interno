'use client';

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}

export default function DateInput({ value, onChange, required = false, disabled = false }: DateInputProps) {
  return (
    <div className="w-full">
      <label className="block text-base font-semibold text-gray-800 mb-3">
        Data {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xl font-medium bg-white text-gray-900"
      />
    </div>
  );
}
