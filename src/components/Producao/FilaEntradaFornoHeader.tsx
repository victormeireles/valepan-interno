'use client';

function fmtQuant(n: number) {
  const rounded = Math.abs(n % 1) < 0.05 ? Math.round(n) : n;
  return rounded.toLocaleString('pt-BR', {
    maximumFractionDigits: rounded % 1 === 0 ? 0 : 1,
  });
}

function hintFaltamFilaEntrada(meta: number, forno: number): string | null {
  if (meta <= 0) return null;
  const faltam = Math.max(0, meta - forno);
  if (faltam < 1e-6) return 'Meta da fila atingida';
  const palavra = Math.abs(faltam - 1) < 0.06 ? 'lata' : 'latas';
  return `Faltam ${fmtQuant(faltam)} ${palavra}`;
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
  unidadesPorAssadeiraHomogenea,
  onFireClick,
}: FilaEntradaFornoHeaderProps) {
  const pct = meta > 0 ? Math.min(100, (forno / meta) * 100) : forno > 0 ? 100 : 0;

  const unitHint =
    unidadesPorAssadeiraHomogenea != null && unidadesPorAssadeiraHomogenea > 0
      ? `latas (LT c/ ${unidadesPorAssadeiraHomogenea.toLocaleString('pt-BR')})`
      : 'latas (várias assadeiras na fila)';

  const hintFaltam = hintFaltamFilaEntrada(meta, forno);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
      <div className="mb-2 sm:mb-3">
        <p className="text-xs font-semibold text-slate-900 sm:text-sm">Entrada no forno — fila geral</p>
        <p className="mt-0.5 text-[10px] leading-snug text-slate-500 sm:text-xs">Soma de todas as ordens · {unitHint}</p>
        {hintFaltam && (
          <p className="mt-1 text-[10px] font-medium text-slate-700 sm:text-xs">{hintFaltam}</p>
        )}
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
          title="Escolher ordem e abrir a etapa de entrada no forno"
          aria-label="Forno — abrir próxima etapa"
          className="inline-flex shrink-0 items-center gap-1 rounded-xl border-2 border-orange-300 bg-gradient-to-b from-orange-50 to-amber-50 px-2.5 py-2 text-xs font-bold text-orange-700 shadow-sm transition-colors hover:from-orange-100 hover:to-amber-100 sm:gap-1.5 sm:rounded-2xl sm:px-3 sm:py-2.5 sm:text-sm"
        >
          <span className="material-icons text-lg leading-none sm:text-2xl" aria-hidden>
            local_fire_department
          </span>
          Forno
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
