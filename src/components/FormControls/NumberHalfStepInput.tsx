'use client';

import { useState, useEffect } from 'react';

interface NumberHalfStepInputProps {
  value: number;
  onChange: (value: number) => void;
  required?: boolean;
  disabled?: boolean;
  label: string;
  min?: number;
  max?: number;
  step?: number;
}

export default function NumberHalfStepInput({ 
  value, 
  onChange, 
  required = false, 
  disabled = false, 
  label,
  min = 0,
  max = 999,
  step = 0.5
}: NumberHalfStepInputProps) {
  const [displayValue, setDisplayValue] = useState(value.toString());

  useEffect(() => {
    setDisplayValue(formatDisplayValue(value));
  }, [value]);

  const handleChange = (inputValue: string) => {
    setDisplayValue(inputValue);
    
    // Tentar converter para número
    if (inputValue === '') {
      onChange(0);
      return;
    }

    // Verificar se contém "1/2"
    if (inputValue.includes('1/2')) {
      const base = inputValue.replace(/\s*1\/2\s*$/, '').trim();
      const baseNum = parseFloat(base);
      if (!isNaN(baseNum)) {
        onChange(baseNum + 0.5);
        return;
      }
    }

    // Converter normalmente
    const num = parseFloat(inputValue);
    if (!isNaN(num) && num >= min && num <= max) {
      onChange(num);
    }
  };

  const handleIncrement = () => {
    const newValue = Math.min(value + step, max);
    onChange(newValue);
    setDisplayValue(formatDisplayValue(newValue));
  };

  const handleDecrement = () => {
    const newValue = Math.max(value - step, min);
    onChange(newValue);
    setDisplayValue(formatDisplayValue(newValue));
  };

  const formatDisplayValue = (val: number): string => {
    if (Number.isInteger(val)) {
      return val.toString();
    }
    
    const integerPart = Math.floor(val);
    const decimalPart = val - integerPart;
    
    if (Math.abs(decimalPart - 0.5) < 0.001) {
      return `${integerPart} 1/2`;
    }
    
    return val.toString();
  };

  const handleBlur = () => {
    setDisplayValue(formatDisplayValue(value));
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
          type="text"
          value={displayValue}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          required={required}
          disabled={disabled}
          placeholder="Ex: 3 ou 3 1/2"
          className="flex-1 min-w-[80px] sm:min-w-[100px] md:min-w-[120px] px-2 sm:px-3 py-4 text-sm sm:text-base md:text-lg text-gray-900 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 placeholder-gray-500 shadow-sm"
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
      
      <p className="text-sm text-gray-600 mt-2 font-medium">
        Use números inteiros ou inteiros + 1/2 (ex: 3, 3.5, 3 1/2)
      </p>
    </div>
  );
}