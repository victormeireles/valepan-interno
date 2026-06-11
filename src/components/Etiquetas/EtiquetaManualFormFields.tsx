'use client';

import { useEffect, useState } from 'react';
import AutocompleteInput from '@/components/FormControls/AutocompleteInput';

export type ManualFormValues = {
  produtoId: string;
  produtoNome: string;
  tipoEstoqueId: string;
  tipoEstoqueNome: string;
  dataFabricacao: string;
};

type TipoEstoqueOption = {
  id: string;
  nome: string;
};

type ProdutoOption = {
  id: string;
  nome: string;
};

type EtiquetaManualFormFieldsProps = {
  values: ManualFormValues;
  onChange: (values: ManualFormValues) => void;
  disabled?: boolean;
};

const inputClass =
  'min-h-11 w-full rounded-lg border border-gray-300 px-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

const labelClass = 'text-sm font-medium text-gray-700';

export default function EtiquetaManualFormFields({
  values,
  onChange,
  disabled = false,
}: EtiquetaManualFormFieldsProps) {
  const [produtoOptions, setProdutoOptions] = useState<ProdutoOption[]>([]);
  const [tipoOptions, setTipoOptions] = useState<TipoEstoqueOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      setLoadingOptions(true);
      try {
        const [produtosRes, tiposRes] = await Promise.all([
          fetch(
            '/api/options/generic?table=produtos&labelField=nome&valueField=id',
          ),
          fetch(
            '/api/options/generic?table=tipos_estoque&labelField=nome&valueField=id&extraFields=possui_etiqueta',
          ),
        ]);

        const produtosData = await produtosRes.json();
        const tiposData = await tiposRes.json();

        if (cancelled) return;

        setProdutoOptions(
          (produtosData.options ?? []).map((o: { label: string; value: string }) => ({
            id: o.value,
            nome: o.label,
          })),
        );

        setTipoOptions(
          (tiposData.options ?? [])
            .filter(
              (o: { meta?: { possui_etiqueta?: boolean } }) =>
                o.meta?.possui_etiqueta === true,
            )
            .map((o: { label: string; value: string }) => ({
              id: o.value,
              nome: o.label,
            })),
        );
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    }

    void loadOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  const produtoNames = produtoOptions.map((p) => p.nome);

  const handleProdutoChange = (nome: string) => {
    const match = produtoOptions.find(
      (p) => p.nome.toLowerCase() === nome.toLowerCase(),
    );
    onChange({
      ...values,
      produtoNome: match?.nome ?? nome,
      produtoId: match?.id ?? '',
    });
  };

  const handleTipoChange = (tipoId: string) => {
    const match = tipoOptions.find((t) => t.id === tipoId);
    onChange({
      ...values,
      tipoEstoqueId: tipoId,
      tipoEstoqueNome: match?.nome ?? '',
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <AutocompleteInput
          label="Produto"
          value={values.produtoNome}
          onChange={handleProdutoChange}
          options={produtoNames}
          placeholder="Buscar produto..."
          required
          strict
          disabled={disabled || loadingOptions}
        />
      </div>

      <div>
        <label htmlFor="tipo-estoque-select" className={`block mb-1 ${labelClass}`}>
          Tipo de estoque <span className="text-red-500">*</span>
        </label>
        <select
          id="tipo-estoque-select"
          value={values.tipoEstoqueId}
          onChange={(e) => handleTipoChange(e.target.value)}
          className={inputClass}
          required
          disabled={disabled || loadingOptions}
        >
          <option value="">Selecione...</option>
          {tipoOptions.map((tipo) => (
            <option key={tipo.id} value={tipo.id}>
              {tipo.nome}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="data-fabricacao" className={`block mb-1 ${labelClass}`}>
          Data de fabricação <span className="text-red-500">*</span>
        </label>
        <input
          id="data-fabricacao"
          type="date"
          value={values.dataFabricacao}
          onChange={(e) =>
            onChange({ ...values, dataFabricacao: e.target.value })
          }
          className={inputClass}
          required
          disabled={disabled}
        />
      </div>
    </div>
  );
}
