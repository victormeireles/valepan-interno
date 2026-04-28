/**
 * Botões de ação compartilhados para formulários de produção
 */

interface ProductionFormActionsProps {
  onCancel: () => void;
  submitLabel: string;
  cancelLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  /** Botões mais baixos e texto menor (mobile / etapa massa) */
  compact?: boolean;
}

export default function ProductionFormActions({
  onCancel,
  submitLabel,
  cancelLabel = 'Cancelar',
  loading = false,
  disabled = false,
  compact = false,
}: ProductionFormActionsProps) {
  const btnBase = compact
    ? 'rounded-lg px-3 py-2 text-xs sm:rounded-lg sm:px-5 sm:py-2.5 sm:text-sm'
    : 'rounded-xl px-6 py-3.5';

  return (
    <div
      className={
        compact
          ? 'flex gap-1.5 pt-1.5 sm:gap-2 sm:pt-3'
          : 'flex gap-3 pt-4'
      }
    >
      <button
        type="button"
        onClick={onCancel}
        className={`flex-1 font-semibold text-gray-700 bg-white border-2 border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-all disabled:opacity-50 ${btnBase}`}
        disabled={loading}
      >
        {cancelLabel}
      </button>
      <button
        type="submit"
        className={`flex-[2] font-semibold text-white bg-gray-900 shadow-lg shadow-gray-900/20 hover:bg-black hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 disabled:shadow-none flex items-center justify-center gap-2 ${btnBase}`}
        disabled={loading || disabled}
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Salvando...</span>
          </>
        ) : (
          <>
            <span>{submitLabel}</span>
            <span className="material-icons text-sm">arrow_forward</span>
          </>
        )}
      </button>
    </div>
  );
}

