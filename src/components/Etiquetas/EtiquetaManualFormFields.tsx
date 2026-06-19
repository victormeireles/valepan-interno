'use client';

import { useEffect, useState } from 'react';
import AutocompleteInput from '@/components/FormControls/AutocompleteInput';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

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

      <Select
        id="tipo-estoque-select"
        label="Tipo de estoque"
        value={values.tipoEstoqueId}
        onChange={(e) => handleTipoChange(e.target.value)}
        required
        disabled={disabled || loadingOptions}
        options={[
          { value: '', label: 'Selecione...' },
          ...tipoOptions.map((tipo) => ({ value: tipo.id, label: tipo.nome })),
        ]}
      />

      <Input
        id="data-fabricacao"
        label="Data de fabricação"
        type="date"
        value={values.dataFabricacao}
        onChange={(e) =>
          onChange({ ...values, dataFabricacao: e.target.value })
        }
        required
        disabled={disabled}
      />
    </div>
  );
}
