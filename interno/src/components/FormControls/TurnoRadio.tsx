'use client';

interface TurnoRadioProps {
  value: 1 | 2;
  onChange: (value: 1 | 2) => void;
  required?: boolean;
  disabled?: boolean;
}

export default function TurnoRadio({ value, onChange, required = false, disabled = false }: TurnoRadioProps) {
  return (
    <div className="w-full">
      <label className="block text-base font-semibold text-gray-800 mb-4">
        Turno {required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex space-x-8">
        <label className="flex items-center cursor-pointer">
          <input
            type="radio"
            name="turno"
            value="1"
            checked={value === 1}
            onChange={(e) => onChange(parseInt(e.target.value) as 1 | 2)}
            required={required}
            disabled={disabled}
            className="h-6 w-6 text-blue-600 focus:ring-blue-500 border-gray-300"
          />
          <span className="ml-3 text-2xl font-bold text-gray-800">1</span>
        </label>
        <label className="flex items-center cursor-pointer">
          <input
            type="radio"
            name="turno"
            value="2"
            checked={value === 2}
            onChange={(e) => onChange(parseInt(e.target.value) as 1 | 2)}
            required={required}
            disabled={disabled}
            className="h-6 w-6 text-blue-600 focus:ring-blue-500 border-gray-300"
          />
          <span className="ml-3 text-2xl font-bold text-gray-800">2</span>
        </label>
      </div>
    </div>
  );
}
