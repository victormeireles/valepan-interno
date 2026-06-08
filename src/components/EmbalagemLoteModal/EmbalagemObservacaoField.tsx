'use client';

import type { ProducaoData } from '@/domain/types';

type Props = {
  formData: ProducaoData;
  setFormData: React.Dispatch<React.SetStateAction<ProducaoData>>;
  loading: boolean;
  isSubmitting: boolean;
};

export default function EmbalagemObservacaoField({
  formData,
  setFormData,
  loading,
  isSubmitting,
}: Props) {
  return (
    <section>
      <label
        htmlFor="obs-embalagem"
        className="block text-sm font-semibold text-gray-800 mb-2"
      >
        Observação (opcional)
      </label>
      <textarea
        id="obs-embalagem"
        value={formData.obsEmbalagem || ''}
        onChange={(e) => setFormData((prev) => ({ ...prev, obsEmbalagem: e.target.value }))}
        placeholder="Observações sobre a embalagem..."
        disabled={loading || isSubmitting}
        rows={2}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white text-gray-900 placeholder-gray-500 resize-y"
      />
    </section>
  );
}
