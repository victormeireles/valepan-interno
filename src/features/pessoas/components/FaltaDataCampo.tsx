'use client';

import { useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { FaltaLancamento } from '@/domain/pessoas/falta-lancamento';
import { addCalendarDaysISO } from '@/lib/utils/date-utils';
import { FaltaDiasMarca } from './FaltaDiasMarca';
import { useFaltaPeriodo } from './use-falta-periodo';

type Props = {
  onDatas: (datas: string[]) => void;
};

export function FaltaDataCampo({ onDatas }: Props) {
  const campo = useFaltaPeriodo(onDatas);
  const limite = campo.inicio
    ? addCalendarDaysISO(campo.inicio, FaltaLancamento.limiteDias - 1)
    : undefined;

  useEffect(() => {
    if (!campo.periodo) return;
    document.getElementById('falta-ate')?.focus();
  }, [campo.periodo]);

  return (
    <div className="flex flex-col gap-3">
      <Input
        label={campo.periodo ? 'De' : 'Data'}
        type="date"
        required
        value={campo.inicio}
        onChange={(event) => campo.setInicio(event.target.value)}
      />
      {campo.periodo ? (
        <Input
          id="falta-ate"
          label="Até"
          type="date"
          required
          min={campo.inicio || undefined}
          max={limite}
          value={campo.fim}
          error={campo.erro}
          onChange={(event) => campo.setFim(event.target.value)}
        />
      ) : null}
      <Switch label="Vários dias" checked={campo.periodo} onChange={campo.alternarPeriodo} />
      {campo.periodo && campo.dias.length > 1 ? (
        <FaltaDiasMarca
          dias={campo.dias}
          marcados={campo.marcados}
          onToggle={campo.alternarDia}
          onMarcarTodos={campo.marcarTodos}
        />
      ) : null}
    </div>
  );
}
