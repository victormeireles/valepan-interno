'use client';

import type { CamposRealizadoEmbalagem } from '@/domain/embalagem/painel-quantidade';
import type { ProducaoData } from '@/domain/types';
import type { PhotoFiles } from '@/domain/validators/PhotoValidator';
import EmbalagemDiscardSheet from './EmbalagemDiscardSheet';
import EmbalagemFotosGrid from './EmbalagemFotosGrid';
import EmbalagemLoteModalFooter from './EmbalagemLoteModalFooter';
import EmbalagemLoteModalHeader from './EmbalagemLoteModalHeader';
import EmbalagemObservacaoField from './EmbalagemObservacaoField';
import EmbalagemPhotoWarningBanner from './EmbalagemPhotoWarningBanner';
import EmbalagemQuantidadeSection from './EmbalagemQuantidadeSection';
import EmbalagemRemovePhotoSheet from './EmbalagemRemovePhotoSheet';

type SlotFoto = 'pacote' | 'etiqueta' | 'pallet';

export type EmbalagemLoteModalShellProps = {
  isNewLote: boolean;
  title: string;
  produto: string;
  cliente: string;
  congelado: 'Sim' | 'Não';
  pedidoMetaOriginal?: { caixas: number; pacotes: number; unidades: number; kg: number };
  pedidoQuantidades?: { caixas: number; pacotes: number; unidades: number; kg: number };
  formData: ProducaoData;
  setFormData: React.Dispatch<React.SetStateAction<ProducaoData>>;
  camposVisiveis: CamposRealizadoEmbalagem;
  photoFiles: PhotoFiles;
  photoLoading: boolean;
  loading: boolean;
  isSubmitting: boolean;
  message: { type: 'success' | 'error'; text: string } | null;
  showPhotoWarning: boolean;
  photoWarningMessage: string;
  showDiscardSheet: boolean;
  removeConfirmSlot: SlotFoto | null;
  showPartial: boolean;
  onRequestClose: () => void;
  onDiscardConfirm: () => void;
  onDiscardCancel: () => void;
  onPhotoWarningContinue: () => void;
  onPhotoWarningBack: () => void;
  onPhotoSelect: (file: File, type: SlotFoto) => void;
  onPhotoRemove: (type: SlotFoto) => void;
  onPhotoManagerRemove: (type: SlotFoto) => void;
  onRemoveRequest: (type: SlotFoto) => void;
  onRemovePhotoConfirm: () => void;
  onRemovePhotoCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onPartial: () => void;
};

export default function EmbalagemLoteModalShell({
  isNewLote,
  title,
  produto,
  cliente,
  congelado,
  pedidoMetaOriginal,
  pedidoQuantidades,
  formData,
  setFormData,
  camposVisiveis,
  photoFiles,
  photoLoading,
  loading,
  isSubmitting,
  message,
  showPhotoWarning,
  photoWarningMessage,
  showDiscardSheet,
  removeConfirmSlot,
  showPartial,
  onRequestClose,
  onDiscardConfirm,
  onDiscardCancel,
  onPhotoWarningContinue,
  onPhotoWarningBack,
  onPhotoSelect,
  onPhotoRemove,
  onPhotoManagerRemove,
  onRemoveRequest,
  onRemovePhotoConfirm,
  onRemovePhotoCancel,
  onSubmit,
  onPartial,
}: EmbalagemLoteModalShellProps) {
  const closeDisabled = isSubmitting || photoLoading || loading;

  return (
    <div
      className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[calc(100dvh-0.75rem)] sm:max-h-[90vh] flex flex-col motion-reduce:transition-none"
      onClick={(e) => e.stopPropagation()}
    >
      <EmbalagemLoteModalHeader
        title={title}
        produto={produto}
        cliente={cliente}
        congelado={congelado}
        pedidoMetaOriginal={pedidoMetaOriginal}
        pedidoQuantidades={pedidoQuantidades}
        onClose={onRequestClose}
        closeDisabled={closeDisabled}
      />

      <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 space-y-6">
          {message && (
            <div
              className={`p-3 rounded-md text-sm ${
                message.type === 'success'
                  ? 'bg-green-100 text-green-800 border border-green-200'
                  : 'bg-red-100 text-red-800 border border-red-200'
              }`}
              role="alert"
            >
              <div className="whitespace-pre-line">{message.text}</div>
            </div>
          )}

          <EmbalagemQuantidadeSection
            camposVisiveis={camposVisiveis}
            formData={formData}
            setFormData={setFormData}
            pedidoQuantidades={pedidoQuantidades}
            loading={loading}
            isSubmitting={isSubmitting}
          />

          <EmbalagemFotosGrid
            cliente={cliente}
            formData={formData}
            photoFiles={photoFiles}
            photoLoading={photoLoading}
            loading={loading}
            onPhotoSelect={onPhotoSelect}
            onPhotoRemove={onPhotoRemove}
            onPhotoManagerRemove={onPhotoManagerRemove}
            onRemoveRequest={onRemoveRequest}
          />

          <EmbalagemObservacaoField
            formData={formData}
            setFormData={setFormData}
            loading={loading}
            isSubmitting={isSubmitting}
          />
        </div>

        {showPhotoWarning && (
          <EmbalagemPhotoWarningBanner
            message={photoWarningMessage}
            onContinue={onPhotoWarningContinue}
            onBack={onPhotoWarningBack}
          />
        )}

        <EmbalagemLoteModalFooter
          isNewLote={isNewLote}
          showPartial={showPartial}
          isSubmitting={isSubmitting}
          photoLoading={photoLoading}
          loading={loading}
          onCancel={onRequestClose}
          onPartial={onPartial}
        />
      </form>

      <EmbalagemDiscardSheet
        open={showDiscardSheet}
        onDiscard={onDiscardConfirm}
        onContinue={onDiscardCancel}
      />

      <EmbalagemRemovePhotoSheet
        slot={removeConfirmSlot}
        onConfirm={onRemovePhotoConfirm}
        onCancel={onRemovePhotoCancel}
      />
    </div>
  );
}
