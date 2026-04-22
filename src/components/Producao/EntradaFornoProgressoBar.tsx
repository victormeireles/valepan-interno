'use client';

function fmtQuant(n: number) {
  const rounded = Math.abs(n % 1) < 0.05 ? Math.round(n) : n;
  return rounded.toLocaleString('pt-BR', {
    maximumFractionDigits: rounded % 1 === 0 ? 0 : 1,
  });
}

function hintFaltamEntradaForno(meta: number, jaEntraram: number): string | null {
  if (meta <= 0) return null;
  const faltam = Math.max(0, meta - jaEntraram);
  if (faltam < 1e-6) return 'Meta desta ordem atingida';
  const palavra = Math.abs(faltam - 1) < 0.06 ? 'lata' : 'latas';
  return `Faltam ${fmtQuant(faltam)} ${palavra}`;
}

type EntradaFornoProgressoBarProps = {
  metaOp: number;
  jaEntraramOp: number;
  totalHoje: number;
  unidadesPorAssadeira: number | null;
  onFireClick: () => void;
  fireDisabled?: boolean;
};

/**
 * Uma única barra de progresso (latas, sem categorias por produto) e o botão de fogo
 * que abre a interface de busca/seleção de carrinhos.
 */
export default function EntradaFornoProgressoBar({
  metaOp,
  jaEntraramOp,
  totalHoje,
  unidadesPorAssadeira,
  onFireClick,
  fireDisabled = false,
}: EntradaFornoProgressoBarProps) {
  const pct =
    metaOp > 0 ? Math.min(100, (jaEntraramOp / metaOp) * 100) : jaEntraramOp > 0 ? 100 : 0;

  const unitHint =
    unidadesPorAssadeira != null && unidadesPorAssadeira > 0
      ? `LT c/ ${unidadesPorAssadeira.toLocaleString('pt-BR')}`
      : 'latas';

  const hintFaltam = hintFaltamEntradaForno(metaOp, jaEntraramOp);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Entrada no forno</p>
          <p className="text-xs text-slate-500 mt-0.5">Progresso em {unitHint}</p>
          {hintFaltam && (
            <p className="text-xs font-medium text-slate-700 mt-1">{hintFaltam}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div
          className="relative h-5 flex-1 min-w-0 overflow-hidden rounded-full bg-slate-200"
          role="img"
          aria-label={`${fmtQuant(jaEntraramOp)} de ${fmtQuant(metaOp)} latas nesta ordem; ${fmtQuant(totalHoje)} latas hoje no forno`}
        >
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>

        <button
          type="button"
          onClick={onFireClick}
          disabled={fireDisabled}
          title="Registrar entrada — buscar carrinho"
          aria-label="Abrir registro de entrada no forno"
          className="shrink-0 flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-orange-300 bg-gradient-to-b from-orange-50 to-amber-50 text-orange-600 shadow-sm hover:from-orange-100 hover:to-amber-100 disabled:opacity-45 disabled:pointer-events-none transition-colors"
        >
          <span className="material-icons text-3xl" aria-hidden>
            local_fire_department
          </span>
        </button>
      </div>

      <p className="mt-3 text-sm text-slate-600 tabular-nums leading-snug">
        <span className="font-semibold text-slate-800">
          {fmtQuant(jaEntraramOp)} / {fmtQuant(metaOp)}
        </span>
        {' · '}
        nesta ordem
        {' · '}
        <span className="text-slate-700">{fmtQuant(totalHoje)} latas hoje</span>
      </p>
    </div>
  );
}
