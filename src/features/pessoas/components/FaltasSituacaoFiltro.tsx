import { Select } from '@/components/ui/Select';
import { FALTA_SITUACAO_OPCOES, type FaltaSituacaoFiltroValor } from '@/domain/pessoas/falta-situacao-filtro';

type Props = {
  value: FaltaSituacaoFiltroValor;
  onChange: (value: FaltaSituacaoFiltroValor) => void;
};

export function FaltasSituacaoFiltro({ value, onChange }: Props) {
  return (
    <Select
      label="Situação"
      value={value}
      options={FALTA_SITUACAO_OPCOES}
      onChange={(event) => onChange(event.target.value as FaltaSituacaoFiltroValor)}
    />
  );
}
