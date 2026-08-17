'use client';

import ProdutoCustoSimuladorDecimalField from '@/components/ProdutosConfig/ProdutoCustoSimuladorDecimalField';
import type { TipoReceita } from '@/components/ProdutosConfig/produto-receita-tipo-options';
import type { ProdutoCustoReceitaCatalogoItem } from '@/domain/produtos/produto-custo-unitario-types';

type TipoOption = {
  value: TipoReceita;
  label: string;
  helper: string;
  icon: string;
};

type Props = {
  option: TipoOption;
  vinculoAtivo: boolean;
  receitasDisponiveis: ProdutoCustoReceitaCatalogoItem[];
  receitaId: string;
  quantidade: number | undefined;
  onReceitaChange: (value: string) => void;
  onQuantidadeChange: (value: number | undefined) => void;
};

const fieldClassName =
  'w-full min-h-11 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10';

export default function ProdutoCustoSimuladorTipoRow({
  option,
  vinculoAtivo,
  receitasDisponiveis,
  receitaId,
  quantidade,
  onReceitaChange,
  onQuantidadeChange,
}: Props) {
  const receitaFieldId = `simulador-receita-${option.value}`;
  const quantidadeFieldId = `simulador-qtd-${option.value}`;

  return (
    <div className="px-3 py-2.5 sm:px-4 sm:py-3">
      <div className="flex flex-col gap-2 lg:grid lg:grid-cols-[7.5rem_minmax(0,1fr)_6rem] lg:items-center lg:gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 border border-gray-100 text-gray-600"
            aria-hidden="true"
          >
            <span className="material-icons text-base">{option.icon}</span>
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">{option.label}</p>
            {vinculoAtivo ? (
              <p className="text-[11px] text-emerald-600">Vinculado</p>
            ) : (
              <p className="text-[11px] text-stone-400">Sem vínculo</p>
            )}
          </div>
        </div>

        <label className="sr-only" htmlFor={receitaFieldId}>
          Receita de {option.label}
        </label>
        <select
          id={receitaFieldId}
          className={fieldClassName}
          value={receitaId}
          onChange={(event) => onReceitaChange(event.target.value)}
        >
          <option value="">Selecione…</option>
          {receitasDisponiveis.map((receita) => (
            <option key={receita.id} value={receita.id}>
              {receita.nome}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor={quantidadeFieldId}>
          Quantidade de {option.label}
        </label>
        <ProdutoCustoSimuladorDecimalField
          id={quantidadeFieldId}
          className={`${fieldClassName} font-mono tabular-nums`}
          placeholder="Qtd"
          value={quantidade}
          onValueChange={onQuantidadeChange}
        />
      </div>
    </div>
  );
}
