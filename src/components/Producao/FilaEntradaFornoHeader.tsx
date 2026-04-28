'use client';

function fmtQuant(n: number) {
  const rounded = Math.abs(n % 1) < 0.05 ? Math.round(n) : n;
  return rounded.toLocaleString('pt-BR', {
    maximumFractionDigits: rounded % 1 === 0 ? 0 : 1,
  });
}

type FilaEntradaFornoHeaderProps = {
  /** Meta agregada (todas as ordens na fila). */
  meta: number;
  /** Volume de fermentação concluído (soma). */
  fermentacao: number;
  /** Latas já na entrada do forno (soma). */
  forno: number;
  /** Total de latas na entrada do forno no dia de referência (servidor). */
  totalHoje: number;
  /** Rótulo após o total (ex.: "hoje" ou "em 15/04/2026"). */
  totalEntradaDiaRotulo?: string;
  unidadesPorAssadeiraHomogenea: number | null;
  onFireClick: () => void;
};

/**
 * Barra única na fila de entrada do forno — não separa por produto.
 */
export default function FilaEntradaFornoHeader({
  meta,
  fermentacao,
  forno,
  totalHoje,
  totalEntradaDiaRotulo = 'hoje',
  unidadesPorAssadeiraHomogenea: _unidadesPorAssadeiraHomogenea,
  onFireClick,
}: FilaEntradaFornoHeaderProps) {
  const pct = meta > 0 ? Math.min(100, (forno / meta) * 100) : forno > 0 ? 100 : 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
      <div className="mb-2 sm:mb-3">
        <p className="text-xs font-semibold text-slate-900 sm:text-sm">Entrada no forno — fila geral</p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div
          className="relative h-4 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200 sm:h-5"
          role="img"
          aria-label={`Entrada ${fmtQuant(forno)} de ${fmtQuant(meta)} latas na fila`}
        >
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>

        <button
          type="button"
          onClick={onFireClick}
          title="Selecionar carrinho e registrar entrada no forno"
          aria-label="Registrar entrada no forno"
          className="inline-flex shrink-0 items-center gap-1 rounded-xl border-2 border-orange-300 bg-gradient-to-b from-orange-50 to-amber-50 px-2.5 py-2 text-xs font-bold text-orange-700 shadow-sm transition-colors hover:from-orange-100 hover:to-amber-100 sm:gap-1.5 sm:rounded-2xl sm:px-3 sm:py-2.5 sm:text-sm"
        >
          <span className="material-icons text-lg leading-none sm:text-2xl" aria-hidden>
            local_fire_department
          </span>
          Registrar entrada
        </button>
      </div>

      <p className="mt-2 text-[11px] tabular-nums leading-snug text-slate-600 sm:mt-3 sm:text-sm">
        <span className="font-semibold text-slate-800">
          {fmtQuant(forno)} / {fmtQuant(meta)}
        </span>
        {' · '}
        entrada na fila
        {' · '}
        <span className="text-slate-700">{fmtQuant(fermentacao)} fermentação</span>
        {' · '}
        <span className="text-slate-700">
          {fmtQuant(totalHoje)} {totalEntradaDiaRotulo}
        </span>
      </p>
    </div>
  );
}
