'use client';

type Props = {
  isNewLote: boolean;
  showPartial: boolean;
  isSubmitting: boolean;
  photoLoading: boolean;
  loading: boolean;
  onCancel: () => void;
  onPartial: () => void;
};

function Spinner() {
  return (
    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export default function EmbalagemLoteModalFooter({
  isNewLote,
  showPartial,
  isSubmitting,
  photoLoading,
  loading,
  onCancel,
  onPartial,
}: Props) {
  const busy = loading || isSubmitting;
  const primaryLabel = isNewLote ? 'Criar lote' : 'Salvar';
  const loadingLabel = photoLoading
    ? 'Enviando fotos…'
    : isNewLote
      ? 'Criando lote…'
      : 'Salvando…';

  return (
    <div className="sticky bottom-0 shrink-0 bg-white border-t border-gray-100 px-5 py-4 sm:px-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 px-4 py-2 rounded-md bg-gray-100 text-gray-800 font-medium hover:bg-gray-200 disabled:opacity-50"
          disabled={busy}
        >
          Cancelar
        </button>
        {showPartial && (
          <button
            type="button"
            onClick={onPartial}
            className="min-h-11 px-4 py-2 rounded-md bg-orange-500 text-white font-medium hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center"
            disabled={busy}
            title="Salvar produção parcial e criar novo pedido com a diferença"
          >
            {isSubmitting ? (
              <>
                <Spinner />
                {loadingLabel}
              </>
            ) : (
              'Salvar Parcial'
            )}
          </button>
        )}
        <button
          type="submit"
          className="min-h-11 px-4 py-2 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
          disabled={busy}
        >
          {isSubmitting ? (
            <>
              <Spinner />
              {loadingLabel}
            </>
          ) : (
            primaryLabel
          )}
        </button>
      </div>
    </div>
  );
}
