'use client';

/** Valor inicial sugerido ao abrir o formulário de saída do forno. */
export const DEFAULT_BANDEJAS_SAIDA = 20;
/** Teto operacional por carrinho na saída do forno. */
export const MAX_BANDEJAS_SAIDA = 20;

type BandejasStepperProps = {
  id?: string;
  /** String numérica (inteiro ≥ 1); use `${DEFAULT_BANDEJAS_SAIDA}` como padrão. */
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  /** Teto dinâmico (ex.: latas ainda disponíveis no carrinho). Nunca ultrapassa {@link MAX_BANDEJAS_SAIDA}. */
  maxBandejas?: number;
};

/**
 * Contador de bandejas (1 bandeja = 1 LT na saída do forno), com padrão 20 e passos de ±1.
 */
export default function BandejasStepper({
  id,
  value,
  onChange,
  disabled,
  maxBandejas,
}: BandejasStepperProps) {
  const effectiveMax =
    typeof maxBandejas === 'number' && maxBandejas >= 1
      ? Math.min(MAX_BANDEJAS_SAIDA, Math.floor(maxBandejas))
      : MAX_BANDEJAS_SAIDA;

  const defaultForDisplay = Math.min(DEFAULT_BANDEJAS_SAIDA, effectiveMax);

  const n = (() => {
    const p = Math.round(Number(String(value).replace(',', '.')));
    if (!Number.isFinite(p) || p < 1) return defaultForDisplay;
    return Math.min(effectiveMax, p);
  })();

  const setCount = (next: number) => {
    onChange(String(Math.max(1, Math.min(effectiveMax, Math.round(next)))));
  };

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-1.5">
      <button
        type="button"
        disabled={disabled || n <= 1}
        onClick={() => setCount(n - 1)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed sm:h-10 sm:w-10"
        aria-label="Diminuir uma bandeja"
      >
        <span className="material-icons text-xl sm:text-2xl">remove</span>
      </button>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        value={value === '' ? String(defaultForDisplay) : value}
        onChange={(e) => {
          const raw = e.target.value.replace(/\D/g, '');
          if (raw === '') {
            onChange('');
            return;
          }
          const v = parseInt(raw, 10);
          if (Number.isFinite(v) && v >= 1) onChange(String(Math.min(effectiveMax, v)));
        }}
        onBlur={() => {
          const p = Math.round(Number(String(value).replace(',', '.')));
          if (!Number.isFinite(p) || p < 1 || value === '') {
            onChange(String(defaultForDisplay));
            return;
          }
          onChange(String(Math.min(effectiveMax, p)));
        }}
        className="w-14 sm:w-16 shrink-0 rounded-lg border-2 border-slate-200 px-1.5 py-1.5 text-center text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100 sm:text-base"
      />
      <button
        type="button"
        disabled={disabled || n >= effectiveMax}
        onClick={() => setCount(n + 1)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed sm:h-10 sm:w-10"
        aria-label="Aumentar uma bandeja"
      >
        <span className="material-icons text-xl sm:text-2xl">add</span>
      </button>
    </div>
  );
}
