'use client';

type Props = {
  open: boolean;
  onDiscard: () => void;
  onContinue: () => void;
};

export default function EmbalagemDiscardSheet({ open, onDiscard, onContinue }: Props) {
  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-10 flex items-end sm:items-center justify-center bg-black/30 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="discard-title"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
        <h3 id="discard-title" className="text-lg font-semibold text-gray-900 mb-2">
          Descartar alterações?
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          O que foi preenchido neste lote será perdido.
        </p>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            type="button"
            onClick={onContinue}
            className="min-h-11 px-4 py-2 rounded-md bg-gray-100 text-gray-800 font-medium hover:bg-gray-200"
          >
            Continuar editando
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="min-h-11 px-4 py-2 rounded-md bg-red-600 text-white font-medium hover:bg-red-700"
          >
            Descartar
          </button>
        </div>
      </div>
    </div>
  );
}
