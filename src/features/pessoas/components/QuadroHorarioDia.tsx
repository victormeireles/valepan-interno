'use client';

import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { HorarioDiaQuadro } from '@/domain/pessoas/quadro-agrupamento';

const ROTULO = ['', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

type Props = {
  dia: HorarioDiaQuadro;
  onChange: (dia: HorarioDiaQuadro) => void;
};

export function QuadroHorarioDia({ dia, onChange }: Props) {
  const trabalha = dia.situacao === 'definido';
  const cruza = trabalha && Boolean(dia.inicio && dia.fim && hora(dia.fim) <= hora(dia.inicio));
  return (
    <fieldset className={['flex min-w-0 flex-col gap-2 rounded-xl border p-3', moldura(dia.situacao)].join(' ')}>
      <legend className="px-1 text-sm font-semibold text-stone-900">{ROTULO[dia.dia]}</legend>
      <Select
        label="Situação"
        value={dia.situacao}
        options={[
          { value: 'definido', label: 'Trabalha' },
          { value: 'nao_trabalha', label: 'Não trabalha' },
          { value: 'a_confirmar', label: 'A confirmar' },
        ]}
        onChange={(event) => onChange({ ...dia, situacao: event.target.value as HorarioDiaQuadro['situacao'] })}
      />
      {trabalha ? (
        <div className="grid grid-cols-2 gap-2 xl:grid-cols-1">
          <Input label="Início" type="time" value={hora(dia.inicio)} onChange={(event) => onChange({ ...dia, inicio: event.target.value })} />
          <Input label="Fim" type="time" value={hora(dia.fim)} onChange={(event) => onChange({ ...dia, fim: event.target.value })} />
        </div>
      ) : null}
      {cruza ? <p className="text-xs font-medium text-amber-800">Até o dia seguinte</p> : null}
    </fieldset>
  );
}

function moldura(situacao: HorarioDiaQuadro['situacao']): string {
  if (situacao === 'nao_trabalha') return 'border-stone-200 bg-stone-50';
  if (situacao === 'a_confirmar') return 'border-amber-200 bg-amber-50/40';
  return 'border-stone-200 bg-white';
}

function hora(valor: string | null): string {
  return valor?.slice(0, 5) ?? '';
}
