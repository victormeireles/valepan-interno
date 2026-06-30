'use client';

import ReceitaGramaturaRow from '@/components/Receitas/ReceitaGramaturaRow';
import type { TipoReceita } from '@/domain/receitas/receita-gramatura-resolver';
import { receitaTipoUsaGramaturaBrilho } from '@/domain/receitas/receita-gramatura-resolver';

export type ReceitaGramaturaFormItem = {
  tempId: string;
  id?: string;
  pesoG: number;
  quantidade: number;
};

type Props = {
  tipo: TipoReceita;
  gramaturas: ReceitaGramaturaFormItem[];
  onChange: (items: ReceitaGramaturaFormItem[]) => void;
};

export default function ReceitaGramaturasSection({ tipo, gramaturas, onChange }: Props) {
  const modoBrilho = receitaTipoUsaGramaturaBrilho(tipo);

  const handleAdd = () => {
    const tempId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);

    onChange([...gramaturas, { tempId, pesoG: 0, quantidade: 0 }]);
  };

  const handleUpdate = (
    tempId: string,
    patch: Partial<Pick<ReceitaGramaturaFormItem, 'pesoG' | 'quantidade'>>,
  ) => {
    onChange(
      gramaturas.map((item) => (item.tempId === tempId ? { ...item, ...patch } : item)),
    );
  };

  const handleRemove = (tempId: string) => {
    onChange(gramaturas.filter((item) => item.tempId !== tempId));
  };

  return (
    <div className="border border-stone-200 rounded-2xl px-6 py-5 space-y-4">
      <div>
        <p className="text-sm font-semibold text-stone-900">
          {modoBrilho ? 'Rendimento do brilho por gramatura' : 'Quantidades por gramatura'}
        </p>
        <p className="text-xs text-stone-500 mt-1">
          {modoBrilho
            ? 'Informe quantos pães de cada gramatura 1 litro da receita cobre (1 kg = 1 L). Ao vincular ao produto, o volume total da receita é multiplicado por esse valor.'
            : 'Ao vincular a um produto, a quantidade será pré-preenchida quando a gramatura coincidir (ex.: 50, 65, 75 g).'}
        </p>
      </div>

      {gramaturas.length > 0 && (
        <div className="space-y-3">
          {gramaturas.map((item) => (
            <ReceitaGramaturaRow
              key={item.tempId}
              modoBrilho={modoBrilho}
              pesoG={item.pesoG}
              quantidade={item.quantidade}
              onPesoChange={(pesoG) => handleUpdate(item.tempId, { pesoG })}
              onQuantidadeChange={(quantidade) => handleUpdate(item.tempId, { quantidade })}
              onRemove={() => handleRemove(item.tempId)}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={handleAdd}
        className="inline-flex items-center px-4 py-2 rounded-xl border-2 border-stone-200 text-stone-800 text-sm font-semibold hover:bg-stone-50 transition-colors"
      >
        <span className="material-icons text-sm mr-2">add</span>
        Adicionar gramatura
      </button>
    </div>
  );
}
