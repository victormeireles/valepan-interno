import type { FolhaPlanoLacuna } from '@/domain/pessoas/folha-resumo';

const MOTIVO: Record<FolhaPlanoLacuna['motivo'], string> = {
  sem_nascimento: 'Sem data de nascimento',
  sem_faixa: 'Sem faixa para a idade',
};

export function FolhaPlanosSemFaixa({ lacunas }: { lacunas: FolhaPlanoLacuna[] }) {
  if (lacunas.length === 0) return null;
  return (
    <section aria-label="Plano de saúde sem valor" className="overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm">
      <div className="flex items-start gap-2 border-b border-amber-100 bg-amber-50 px-4 py-3">
        <span className="material-icons text-amber-800" aria-hidden>
          health_and_safety
        </span>
        <div>
          <h2 className="text-sm font-semibold text-stone-900">
            Plano de saúde sem valor · <span className="font-mono tabular-nums">{lacunas.length.toLocaleString('pt-BR')}</span>
          </h2>
          <p className="text-sm text-stone-700">Marcados no pacote, mas sem idade ou sem faixa. Entram como R$ 0,00.</p>
        </div>
      </div>
      <ul>
        {lacunas.map((item, index) => (
          <li
            key={`${item.setorNome}-${item.nome}-${index}`}
            className="flex min-h-11 items-center justify-between gap-3 border-b border-stone-100 px-4 py-2 last:border-0"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-stone-900">{item.nome}</span>
              <span className="block truncate text-xs text-stone-500">{item.setorNome}</span>
            </span>
            <span className="shrink-0 rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">{MOTIVO[item.motivo]}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
