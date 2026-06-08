'use client';

type SlotFoto = 'pacote' | 'etiqueta' | 'pallet';

const LABELS: Record<SlotFoto, string> = {
  pacote: 'Pacote',
  etiqueta: 'Etiqueta',
  pallet: 'Pallet',
};

type Props = {
  slot: SlotFoto | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function EmbalagemRemovePhotoSheet({ slot, onConfirm, onCancel }: Props) {
  if (!slot) return null;

  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="remove-photo-title"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
        <h3 id="remove-photo-title" className="text-lg font-semibold text-gray-900 mb-2">
          Remover foto?
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          A foto de {LABELS[slot]} será removida deste lote.
        </p>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 px-4 py-2 rounded-md bg-gray-100 text-gray-800 font-medium hover:bg-gray-200"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-11 px-4 py-2 rounded-md bg-red-600 text-white font-medium hover:bg-red-700"
          >
            Remover
          </button>
        </div>
      </div>
    </div>
  );
}
