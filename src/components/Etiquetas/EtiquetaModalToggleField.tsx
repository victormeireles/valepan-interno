type EtiquetaModalToggleFieldProps = {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
};

const labelClass = 'text-sm font-medium text-gray-700';

export default function EtiquetaModalToggleField({
  label,
  checked,
  onChange,
  disabled,
}: EtiquetaModalToggleFieldProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={labelClass}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 ${
          checked ? 'bg-gray-900' : 'bg-gray-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
