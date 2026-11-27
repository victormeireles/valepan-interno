import { Select } from '@/components/ui/Select';

const OPCOES = [
  { value: 'injustificada', label: 'Injustificadas' },
  { value: 'justificada', label: 'Justificadas' },
  { value: 'suspensao', label: 'Suspensões' },
  { value: '', label: 'Todas' },
];

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function FaltasClassificacaoFiltro({ value, onChange }: Props) {
  return (
    <Select
      label="Classificação"
      value={value}
      options={OPCOES}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
