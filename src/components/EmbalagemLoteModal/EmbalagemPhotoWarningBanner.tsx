'use client';

type Props = {
  message: string;
  onContinue: () => void;
  onBack: () => void;
};

export default function EmbalagemPhotoWarningBanner({ message, onContinue, onBack }: Props) {
  return (
    <div className="mx-5 mb-3 sm:mx-6 p-4 rounded-lg border border-amber-300 bg-amber-50" role="alert">
      <p className="text-sm text-amber-900 whitespace-pre-line mb-3">{message}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onBack}
          className="min-h-11 px-3 py-2 text-sm font-medium rounded-md bg-white border border-amber-300 text-amber-900"
        >
          Voltar e adicionar fotos
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="min-h-11 px-3 py-2 text-sm font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700"
        >
          Continuar sem fotos
        </button>
      </div>
    </div>
  );
}
