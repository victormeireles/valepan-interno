import { Select } from '@/components/ui/Select';
import {
  FALTA_SETOR_TIPO_OPCOES,
  type FaltaSetorTipoFiltroValor,
} from '@/domain/pessoas/falta-setor-tipo-filtro';

type Props = {
  value: FaltaSetorTipoFiltroValor;
  onChange: (value: FaltaSetorTipoFiltroValor) => void;
};

export function FaltasSetorTipoFiltro({ value, onChange }: Props) {
  return (
    <Select
      label="Tipo de setor"
      value={value}
      options={FALTA_SETOR_TIPO_OPCOES}
      onChange={(event) => onChange(event.target.value as FaltaSetorTipoFiltroValor)}
    />
  );
}
