const OPCOES = [
  { value: 'injustificada', label: 'Injustificadas' },
  { value: 'justificada', label: 'Justificadas' },
  { value: 'suspensao', label: 'Suspensões' },
  { value: '', label: 'Todas' },
] as const;

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function FaltasClassificacaoFiltro({ value, onChange }: Props) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-sm font-medium text-stone-700">Classificação</span>
      <div
        role="tablist"
        aria-label="Classificação"
        className="flex w-full min-w-0 overflow-x-auto rounded-xl border border-stone-200 bg-white p-1"
      >
        {OPCOES.map((opcao) => {
          const ativo = value === opcao.value;
          return (
            <button
              key={opcao.label}
              type="button"
              role="tab"
              aria-selected={ativo}
              onClick={() => onChange(opcao.value)}
              className={[
                'min-h-11 min-w-0 flex-1 whitespace-nowrap rounded-lg px-2 text-center text-xs font-medium sm:px-3 sm:text-sm',
                ativo ? tomAtivo(opcao.value) : 'text-stone-600 hover:bg-stone-50',
              ].join(' ')}
            >
              {opcao.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function tomAtivo(value: string): string {
  if (value === 'injustificada') return 'bg-red-50 text-red-800';
  if (value === 'justificada') return 'bg-emerald-50 text-emerald-800';
  if (value === 'suspensao') return 'bg-amber-100 text-amber-800';
  return 'bg-stone-100 text-stone-900';
}
