import { Switch } from '@/components/ui/Switch';

type EtiquetaModalToggleFieldProps = {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
};

export default function EtiquetaModalToggleField({
  label,
  checked,
  onChange,
  disabled,
}: EtiquetaModalToggleFieldProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      <Switch checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}
