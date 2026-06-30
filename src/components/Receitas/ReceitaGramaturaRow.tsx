'use client';

type Props = {
  modoBrilho?: boolean;
  pesoG: number;
  quantidade: number;
  onPesoChange: (value: number) => void;
  onQuantidadeChange: (value: number) => void;
  onRemove: () => void;
};

const fieldClassName =
  'w-full min-h-11 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10';

export default function ReceitaGramaturaRow({
  modoBrilho = false,
  pesoG,
  quantidade,
  onPesoChange,
  onQuantidadeChange,
  onRemove,
}: Props) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-stone-100 bg-stone-50/80 p-4 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label className="mb-1.5 block text-sm font-semibold text-stone-700">Gramatura (g)</label>
        <input
          type="number"
          min={1}
          step={1}
          value={pesoG || ''}
          onChange={(e) => onPesoChange(parseInt(e.target.value, 10) || 0)}
          className={`${fieldClassName} tabular-nums`}
          placeholder="Ex: 65"
        />
      </div>
      <div className="flex-1">
        <label className="mb-1.5 block text-sm font-semibold text-stone-700">
          {modoBrilho ? 'Pães por 1 L' : 'Quantidade padrão'}
        </label>
        <input
          type="number"
          min={0}
          step={modoBrilho ? 1 : 0.001}
          value={quantidade || ''}
          onChange={(e) => onQuantidadeChange(parseFloat(e.target.value) || 0)}
          className={`${fieldClassName} tabular-nums`}
          placeholder={modoBrilho ? 'Ex: 4888' : 'Ex: 12'}
        />
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl text-rose-600 hover:bg-rose-50"
        aria-label="Remover gramatura"
      >
        <span className="material-icons text-base">delete</span>
      </button>
    </div>
  );
}
