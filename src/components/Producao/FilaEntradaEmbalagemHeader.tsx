'use client';

function fmtQuant(n: number) {
  const rounded = Math.abs(n % 1) < 0.05 ? Math.round(n) : n;
  return rounded.toLocaleString('pt-BR', {
    maximumFractionDigits: rounded % 1 === 0 ? 0 : 1,
  });
}

function hintFaltamEntrada(meta: number, entrada: number): string | null {
  if (meta <= 0) return null;
  const faltam = Math.max(0, meta - entrada);
  if (faltam < 1e-6) return 'Meta da fila atingida na entrada da embalagem';
  const palavra = Math.abs(faltam - 1) < 0.06 ? 'lata' : 'latas';
  return `Faltam ${fmtQuant(faltam)} ${palavra}`;
}

type FilaEntradaEmbalagemHeaderProps = {
  meta: number;
  saidaForno: number;
  entradaEmbalagem: number;
  unidadesPorAssadeiraHomogenea: number | null;
  onIniciar: () => void;
};

/**
 * Barra única na fila de entrada da embalagem (soma entrada / meta), no mesmo espírito da entrada no forno.
 */
export default function FilaEntradaEmbalagemHeader({
  meta,
  saidaForno,
  entradaEmbalagem,
  unidadesPorAssadeiraHomogenea,
  onIniciar,
}: FilaEntradaEmbalagemHeaderProps) {
  const pct = meta > 0 ? Math.min(100, (entradaEmbalagem / meta) * 100) : entradaEmbalagem > 0 ? 100 : 0;

  const unitHint =
    unidadesPorAssadeiraHomogenea != null && unidadesPorAssadeiraHomogenea > 0
      ? `latas (LT c/ ${unidadesPorAssadeiraHomogenea.toLocaleString('pt-BR')})`
      : 'latas (várias assadeiras na fila)';

  const hintFaltam = hintFaltamEntrada(meta, entradaEmbalagem);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
      <div className="mb-2 sm:mb-3">
        <p className="text-xs font-semibold text-slate-900 sm:text-sm">Entrada na embalagem — fila geral</p>
        <p className="mt-0.5 text-[10px] leading-snug text-slate-500 sm:text-xs">Soma de todas as ordens · {unitHint}</p>
        {hintFaltam && (
          <p className="mt-1 text-[10px] font-medium text-slate-700 sm:text-xs">{hintFaltam}</p>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div
          className="relative h-4 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200 sm:h-5"
          role="img"
          aria-label={`Entrada na embalagem ${fmtQuant(entradaEmbalagem)} de ${fmtQuant(meta)} latas na fila`}
        >
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>

        <button
          type="button"
          onClick={onIniciar}
          title="Abrir busca de carrinhos da saída do forno"
          aria-label="Iniciar entrada na embalagem"
          className="inline-flex shrink-0 items-center gap-1 rounded-xl border-2 border-emerald-300 bg-gradient-to-b from-emerald-50 to-teal-50 px-2.5 py-2 text-xs font-bold text-emerald-900 shadow-sm transition-colors hover:from-emerald-100 hover:to-teal-100 sm:gap-1.5 sm:rounded-2xl sm:px-3 sm:py-2.5 sm:text-sm"
        >
          <span className="material-icons text-lg leading-none sm:text-2xl" aria-hidden>
            play_circle_outline
          </span>
          Iniciar
        </button>
      </div>

      <p className="mt-2 text-[11px] tabular-nums leading-snug text-slate-600 sm:mt-3 sm:text-sm">
        <span className="font-semibold text-slate-800">
          {fmtQuant(entradaEmbalagem)} / {fmtQuant(meta)}
        </span>
        {' · '}
        entrada na fila
        {' · '}
        <span className="text-slate-700">{fmtQuant(saidaForno)} saída do forno</span>
      </p>
    </div>
  );
}
