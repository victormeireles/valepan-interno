'use client';

type OrdemProducaoRowCheckboxProps = {
  checked: boolean;
  onChange: () => void;
  ariaLabel: string;
  className?: string;
};

const checkboxClass =
  'h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-2 focus:ring-amber-500 focus:ring-offset-0';

export default function OrdemProducaoRowCheckbox({
  checked,
  onChange,
  ariaLabel,
  className = '',
}: OrdemProducaoRowCheckboxProps) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => {
        event.stopPropagation();
        onChange();
      }}
      onClick={(event) => event.stopPropagation()}
      aria-label={ariaLabel}
      className={`${checkboxClass} ${className}`}
    />
  );
}
