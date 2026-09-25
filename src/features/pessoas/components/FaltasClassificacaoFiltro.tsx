const OPCOES = [
  { value: 'injustificada', label: 'Injustificadas' },
  { value: 'justificada', label: 'Justificadas' },
  { value: '', label: 'Todas' },
] as const;

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function FaltasClassificacaoFiltro({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-stone-700">Classificação</span>
    <div role="tablist" aria-label="Classificação" className="inline-flex rounded-xl border border-stone-200 bg-white p-1">
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
              'h-11 rounded-lg px-4 text-sm font-medium',
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
  return 'bg-stone-100 text-stone-900';
}
