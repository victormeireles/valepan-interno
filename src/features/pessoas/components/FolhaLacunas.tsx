import type { FolhaLacuna, FolhaSituacao } from '@/domain/pessoas/folha-resumo';

const ROTULO: Record<FolhaSituacao, string> = {
  ativo: 'Ativo',
  afastado: 'Fora do posto',
  admissao_prevista: 'A entrar',
};

export function FolhaLacunas({ lacunas }: { lacunas: FolhaLacuna[] }) {
  if (lacunas.length === 0) return <Completa />;
  return (
    <section aria-label="Sem remuneração" className="overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm">
      <div className="flex items-start gap-2 border-b border-amber-100 bg-amber-50 px-4 py-3">
        <span className="material-icons text-amber-800" aria-hidden>
          warning
        </span>
        <div>
          <h2 className="text-sm font-semibold text-stone-900">
            Sem remuneração · <span className="font-mono tabular-nums">{lacunas.length.toLocaleString('pt-BR')}</span>
          </h2>
          <p className="text-sm text-stone-700">Entram na contagem de pessoas e não entram no valor.</p>
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
            <span className="shrink-0 rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
              {ROTULO[item.situacao]}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Completa() {
  return (
    <p className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
      <span className="material-icons text-emerald-700" aria-hidden>
        check_circle
      </span>
      Todos os ativos e a entrar têm pacote vigente.
    </p>
  );
}
