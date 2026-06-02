'use client';

function fmtQuant(n: number) {
  const rounded = Math.abs(n % 1) < 0.05 ? Math.round(n) : n;
  return rounded.toLocaleString('pt-BR', {
    maximumFractionDigits: rounded % 1 === 0 ? 0 : 1,
  });
}

type FilaEntradaEmbalagemHeaderProps = {
  meta: number;
  saidaForno: number;
  entradaEmbalagem: number;
  onIniciar: () => void;
};

/**
 * Barra única na fila de entrada da embalagem (soma entrada / meta), no mesmo espírito da entrada no forno.
 */
export default function FilaEntradaEmbalagemHeader({
  meta,
  saidaForno,
  entradaEmbalagem,
  onIniciar,
}: FilaEntradaEmbalagemHeaderProps) {
  const pct = meta > 0 ? Math.min(100, (entradaEmbalagem / meta) * 100) : entradaEmbalagem > 0 ? 100 : 0;
  const podeIniciarCarrinho = saidaForno > 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
      <div className="mb-2 sm:mb-3">
        <p className="text-xs font-semibold text-slate-900 sm:text-sm">Entrada na embalagem — fila geral</p>
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
          disabled={!podeIniciarCarrinho}
          title={podeIniciarCarrinho ? 'Registrar entrada de carrinho' : 'Registre a saída do forno antes'}
          aria-label="Iniciar entrada na embalagem"
          className={`inline-flex shrink-0 items-center gap-1 rounded-xl border-2 px-2.5 py-2 text-xs font-bold shadow-sm transition-colors sm:gap-1.5 sm:rounded-2xl sm:px-3 sm:py-2.5 sm:text-sm ${
            podeIniciarCarrinho
              ? 'border-emerald-300 bg-gradient-to-b from-emerald-50 to-teal-50 text-emerald-900 hover:from-emerald-100 hover:to-teal-100'
              : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
          }`}
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
