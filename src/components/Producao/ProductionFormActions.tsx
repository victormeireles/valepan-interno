/**
 * Botões de ação compartilhados para formulários de produção
 */

interface ProductionFormActionsProps {
  onCancel: () => void;
  submitLabel: string;
  cancelLabel?: string;
  loading?: boolean;
  disabled?: boolean;
}

export default function ProductionFormActions({
  onCancel,
  submitLabel,
  cancelLabel = 'Cancelar',
  loading = false,
  disabled = false,
}: ProductionFormActionsProps) {
  return (
    <div className="pt-4 flex gap-3">
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 px-6 py-3.5 text-gray-700 bg-white border-2 border-gray-100 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-200 transition-all disabled:opacity-50"
        disabled={loading}
      >
        {cancelLabel}
      </button>
      <button
        type="submit"
        className="flex-[2] px-6 py-3.5 text-white bg-gray-900 rounded-xl font-semibold shadow-lg shadow-gray-900/20 hover:bg-black hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 disabled:shadow-none flex items-center justify-center gap-2"
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

