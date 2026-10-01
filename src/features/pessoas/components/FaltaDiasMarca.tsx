'use client';

import { Button } from '@/components/ui/Button';
import { formatISODateBr } from '@/lib/utils/date-utils';

type Props = {
  dias: string[];
  marcados: string[];
  onToggle: (data: string) => void;
  onMarcarTodos: () => void;
};

export function FaltaDiasMarca({ dias, marcados, onToggle, onMarcarTodos }: Props) {
  const escolhidos = marcados.length;
  const total = dias.length;
  const legenda = escolhidos === total
    ? `${total.toLocaleString('pt-BR')} faltas`
    : `${escolhidos.toLocaleString('pt-BR')} de ${total.toLocaleString('pt-BR')} dias`;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex min-h-11 items-center justify-between gap-2">
        <p id="falta-dias-rotulo" aria-live="polite" className="font-mono text-sm font-medium tabular-nums text-stone-700">
          {legenda}
        </p>
        {escolhidos < total ? (
          <Button type="button" variant="ghost" size="lg" onClick={onMarcarTodos}>Marcar todos</Button>
        ) : null}
      </div>
      <ul aria-labelledby="falta-dias-rotulo" className="max-h-60 overflow-y-auto rounded-xl border border-stone-200">
        {dias.map((dia) => (
          <li key={dia} className="border-b border-stone-100 last:border-b-0">
            <label className="flex min-h-11 cursor-pointer items-center gap-3 px-3">
              <input
                type="checkbox"
                className="size-5 rounded border-stone-300 text-amber-600 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
                checked={marcados.includes(dia)}
                onChange={() => onToggle(dia)}
              />
              <DiaRotulo iso={dia} />
            </label>
          </li>
        ))}
      </ul>
      {escolhidos === 0 ? <p className="text-xs text-danger-fg">Selecione ao menos um dia.</p> : null}
    </div>
  );
}

function DiaRotulo({ iso }: { iso: string }) {
  const [ano, mes, dia] = iso.split('-').map(Number);
  const semana = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' })
    .format(new Date(Date.UTC(ano, mes - 1, dia, 12)));
  return (
    <span className="text-sm text-stone-800">
      <span className="capitalize">{semana.replace('.', '')}</span>
      <span className="font-mono tabular-nums"> · {formatISODateBr(iso)}</span>
    </span>
  );
}
