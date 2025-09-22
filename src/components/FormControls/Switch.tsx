'use client';

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
  label = "Opção",
  trueLabel = "Sim",
  falseLabel = "Não"
}: SwitchProps) {
  return (
    <div className="w-full">
      <label className="block text-base font-semibold text-gray-800 mb-3">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => onChange(false)}
          disabled={disabled}
          className={`px-4 py-2 rounded-l-lg border-2 font-medium transition-colors ${
            !value
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {falseLabel}
        </button>
        <button
          type="button"
          onClick={() => onChange(true)}
          disabled={disabled}
          className={`px-4 py-2 rounded-r-lg border-2 border-l-0 font-medium transition-colors ${
            value
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {trueLabel}
        </button>
      </div>
    </div>
  );
}
