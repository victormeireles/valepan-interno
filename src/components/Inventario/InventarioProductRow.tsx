import { useMemo, useState, useEffect } from 'react';
import AutocompleteInput from '@/components/FormControls/AutocompleteInput';

export type InventarioProdutoInput = {
  produto: string;
  quantidade: {
    caixas: number;
    pacotes: number;
    unidades: number;
    kg: number;
  };
};

type ProdutoOption = {
  produto: string;
  unidade: string;
};

interface InventarioProductRowProps {
  item: InventarioProdutoInput;
  onChange: (item: InventarioProdutoInput) => void;
  onRemove: () => void;
  produtoOptions: ProdutoOption[];
  disabled?: boolean;
}

export function InventarioProductRow({
  item,
  onChange,
  onRemove,
  produtoOptions,
  disabled = false,
}: InventarioProductRowProps) {
  const unidadePadrao = useMemo(() => {
    if (!item.produto) return '';
    const found = produtoOptions.find(
      (option) => option.produto.toLowerCase() === item.produto.toLowerCase(),
    );
    return found?.unidade ?? '';
  }, [item.produto, produtoOptions]);

  // Estado para valores de display (vazio quando zero)
  const [displayValues, setDisplayValues] = useState<{ [key: string]: string }>({
    caixas: item.quantidade.caixas === 0 ? '' : item.quantidade.caixas.toString(),
    pacotes: item.quantidade.pacotes === 0 ? '' : item.quantidade.pacotes.toString(),
    unidades: item.quantidade.unidades === 0 ? '' : item.quantidade.unidades.toString(),
    kg: item.quantidade.kg === 0 ? '' : item.quantidade.kg.toString(),
  });

  // Sincronizar display values quando item.quantidade mudar externamente
  useEffect(() => {
    setDisplayValues({
      caixas: item.quantidade.caixas === 0 ? '' : item.quantidade.caixas.toString(),
      pacotes: item.quantidade.pacotes === 0 ? '' : item.quantidade.pacotes.toString(),
      unidades: item.quantidade.unidades === 0 ? '' : item.quantidade.unidades.toString(),
      kg: item.quantidade.kg === 0 ? '' : item.quantidade.kg.toString(),
    });
  }, [item.quantidade]);

  const updateQuantidade = (key: keyof InventarioProdutoInput['quantidade'], value: number) => {
    onChange({
      ...item,
      quantidade: {
        ...item.quantidade,
        [key]: Number.isNaN(value) ? 0 : value,
      },
    });
  };

  const handleQuantidadeChange = (field: keyof InventarioProdutoInput['quantidade'], inputValue: string) => {
    // Atualizar display value
    setDisplayValues((prev) => ({
      ...prev,
      [field]: inputValue,
    }));

    // Converter para número e atualizar quantidade
    if (inputValue === '') {
      updateQuantidade(field, 0);
    } else {
      const numValue = field === 'kg' ? parseFloat(inputValue) : parseInt(inputValue);
      if (!isNaN(numValue)) {
        updateQuantidade(field, numValue);
      }
    }
  };

  const handleQuantidadeBlur = (field: keyof InventarioProdutoInput['quantidade']) => {
    // Normalizar display value no blur
    const currentValue = item.quantidade[field] ?? 0;
    setDisplayValues((prev) => ({
      ...prev,
      [field]: currentValue === 0 ? '' : currentValue.toString(),
    }));
  };

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-950/60 px-4 py-4 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <AutocompleteInput
            value={item.produto}
            onChange={(value) =>
              onChange({
                ...item,
                produto: value,
              })
            }
            options={produtoOptions.map((option) => option.produto)}
            placeholder="Busque o produto..."
            required
            label="Produto"
            disabled={disabled}
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="w-full rounded-full border border-red-500 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-red-300 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50 sm:mt-8 sm:w-auto"
          disabled={disabled}
        >
          Remover
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400 sm:grid-cols-4">
        {(['caixas', 'pacotes', 'unidades', 'kg'] as const).map((field) => (
          <label key={field} className="flex flex-col gap-1">
            <span>{field}</span>
            <input
              type="number"
              min={0}
              step={field === 'kg' ? 0.01 : 1}
              value={displayValues[field]}
              onChange={(event) =>
                handleQuantidadeChange(field, event.target.value)
              }
              onBlur={() => handleQuantidadeBlur(field)}
              inputMode="decimal"
              pattern="[0-9]*"
              className="w-full rounded-lg border border-gray-800 bg-gray-900/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={disabled}
            />
          </label>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] uppercase tracking-wide text-gray-500">
        <span>
          Unidade padrão:{' '}
          <span className="font-semibold text-gray-200">
            {unidadePadrao || '—'}
          </span>
        </span>
        <span className="text-gray-600">Campos vazios = zero</span>
      </div>
    </div>
  );
}
