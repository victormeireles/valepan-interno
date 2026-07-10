'use client';

import NumberInput from '@/components/FormControls/NumberInput';
import ProducaoLoteAtalhosButtons from '@/components/FormControls/ProducaoLoteAtalhosButtons';
import {
  aplicarAtalhoLotePadrao,
  aplicarAtalhoLoteValor,
  calcularSaldoLoteRestante,
  LOTE_PADRAO_CAIXAS_EMBALAGEM,
  type ProducaoLoteAtalhoUnidade,
} from '@/domain/realizado/producao-lote-atalhos';
import type { CamposRealizadoEmbalagem } from '@/domain/embalagem/painel-quantidade';
import type { ProducaoData } from '@/domain/types';

type Props = {
  camposVisiveis: CamposRealizadoEmbalagem;
  formData: ProducaoData;
  setFormData: React.Dispatch<React.SetStateAction<ProducaoData>>;
  metaReferencia: number;
  produzidoAtual: number;
  unidade: string;
  loading: boolean;
  isSubmitting: boolean;
};

function resolverUnidadeAtalho(unidade: string): ProducaoLoteAtalhoUnidade {
  const norm = unidade.toUpperCase();
  if (norm === 'CX') return 'cx';
  if (norm === 'UN') return 'UN';
  return 'cx';
}

export default function EmbalagemQuantidadeSection({
  camposVisiveis,
  formData,
  setFormData,
  metaReferencia,
  produzidoAtual,
  unidade,
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
  const saldoRestante = calcularSaldoLoteRestante(metaReferencia, produzidoAtual);
  const unidadeAtalho = resolverUnidadeAtalho(unidade);
  const busy = loading || isSubmitting;

  const handlePreencherLotePadrao = () => {
    setFormData((prev) => aplicarAtalhoLotePadrao(prev, 'embalagem-caixas'));
  };

  const handlePreencherSaldoRestante = () => {
    setFormData((prev) => aplicarAtalhoLoteValor(prev, 'caixas', saldoRestante));
  };

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
      {camposVisiveis.caixas ? (
        <ProducaoLoteAtalhosButtons
          lotePadrao={LOTE_PADRAO_CAIXAS_EMBALAGEM}
          saldoRestante={saldoRestante}
          unidade={unidadeAtalho}
          disabled={busy}
          placement="below"
          onPreencherPadrao={handlePreencherLotePadrao}
          onPreencherRestante={handlePreencherSaldoRestante}
        />
      ) : null}
    </section>
  );
}
