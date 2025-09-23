'use client';

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  required?: boolean;
  disabled?: boolean;
  label: string;
  min?: number;
  step?: number;
  max?: number;
}

export default function NumberInput({ 
  value, 
  onChange, 
  required = false, 
  disabled = false, 
  label,
  min = 0,
  step = 1,
  max = 999
}: NumberInputProps) {
  const handleIncrement = () => {
    const newValue = Math.min(value + step, max);
    onChange(newValue);
  };

  const handleDecrement = () => {
    const newValue = Math.max(value - step, min);
    onChange(newValue);
  };

  return (
    <div className="w-full">
      <label className="block text-base font-semibold text-gray-800 mb-3">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      <div className="flex items-center space-x-1 max-w-full">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || value <= min}
          className="px-2 sm:px-3 md:px-3 py-4 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 text-gray-700 font-bold text-xl sm:text-2xl rounded-lg border-2 border-gray-300 hover:border-gray-400 disabled:border-gray-200 transition-colors flex items-center justify-center shadow-sm hover:shadow-md min-w-[40px] sm:min-w-[45px] md:min-w-[45px] flex-shrink-0"
        >
          −
        </button>
        
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
          required={required}
          disabled={disabled}
          min={min}
          step={step}
          max={max}
          className="flex-1 min-w-[80px] sm:min-w-[100px] md:min-w-[120px] px-2 sm:px-3 py-4 text-sm sm:text-base md:text-lg text-gray-900 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 shadow-sm"
        />
        
        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || value >= max}
          className="px-2 sm:px-3 md:px-3 py-4 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 text-gray-700 font-bold text-xl sm:text-2xl rounded-lg border-2 border-gray-300 hover:border-gray-400 disabled:border-gray-200 transition-colors flex items-center justify-center shadow-sm hover:shadow-md min-w-[40px] sm:min-w-[45px] md:min-w-[45px] flex-shrink-0"
        >
          +
        </button>
      </div>
    </div>
  );
}
