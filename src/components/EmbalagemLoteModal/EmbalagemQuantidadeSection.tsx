'use client';

import NumberInput from '@/components/FormControls/NumberInput';
import type { CamposRealizadoEmbalagem } from '@/domain/embalagem/painel-quantidade';
import type { ProducaoData } from '@/domain/types';

type Props = {
  camposVisiveis: CamposRealizadoEmbalagem;
  formData: ProducaoData;
  setFormData: React.Dispatch<React.SetStateAction<ProducaoData>>;
  pedidoQuantidades?: { caixas: number; pacotes: number; unidades: number; kg: number };
  loading: boolean;
  isSubmitting: boolean;
};

export default function EmbalagemQuantidadeSection({
  camposVisiveis,
  formData,
  setFormData,
  pedidoQuantidades,
  loading,
  isSubmitting,
}: Props) {
  const visibleCount = [
    camposVisiveis.caixas,
    camposVisiveis.pacotes,
    camposVisiveis.unidades,
    camposVisiveis.kg,
  ].filter(Boolean).length;

  const gridCols = visibleCount === 1 ? 'grid-cols-1' : 'grid-cols-2';

  const handlePreencherRestante = () => {
    if (!pedidoQuantidades) return;
    setFormData((prev) => ({
      ...prev,
      caixas: camposVisiveis.caixas ? pedidoQuantidades.caixas : prev.caixas,
      pacotes: camposVisiveis.pacotes ? pedidoQuantidades.pacotes : prev.pacotes,
      unidades: camposVisiveis.unidades ? pedidoQuantidades.unidades : prev.unidades,
      kg: camposVisiveis.kg ? pedidoQuantidades.kg : prev.kg,
    }));
  };

  const hasSaldo =
    pedidoQuantidades &&
    ((camposVisiveis.caixas && pedidoQuantidades.caixas > 0) ||
      (camposVisiveis.pacotes && pedidoQuantidades.pacotes > 0) ||
      (camposVisiveis.unidades && pedidoQuantidades.unidades > 0) ||
      (camposVisiveis.kg && pedidoQuantidades.kg > 0));

  return (
    <section>
      <h3 className="text-sm font-semibold text-gray-800 mb-3">Quantidade embalada</h3>
      <div className={`grid ${gridCols} gap-5`}>
        {camposVisiveis.caixas && (
          <NumberInput
            label="Caixas"
            value={formData.caixas}
            onChange={(value) => setFormData((prev) => ({ ...prev, caixas: value }))}
            min={0}
            step={1}
          />
        )}
        {camposVisiveis.pacotes && (
          <NumberInput
            label="Pacotes"
            value={formData.pacotes}
            onChange={(value) => setFormData((prev) => ({ ...prev, pacotes: value }))}
            min={0}
            step={1}
          />
        )}
        {camposVisiveis.unidades && (
          <NumberInput
            label="Unidades"
            value={formData.unidades}
            onChange={(value) => setFormData((prev) => ({ ...prev, unidades: value }))}
            min={0}
            step={1}
          />
        )}
        {camposVisiveis.kg && (
          <NumberInput
            label="Kg"
            value={formData.kg}
            onChange={(value) => setFormData((prev) => ({ ...prev, kg: value }))}
            min={0}
            step={1}
          />
        )}
      </div>
      {hasSaldo && (
        <button
          type="button"
          onClick={handlePreencherRestante}
          disabled={loading || isSubmitting}
          className="mt-3 min-h-11 px-3 py-2 text-sm font-medium rounded-md border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 disabled:opacity-50"
        >
          Preencher quantidade
        </button>
      )}
    </section>
  );
}
