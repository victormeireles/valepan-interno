'use client';

import type { InsumoReceitaAssociacao } from '@/domain/receitas/insumo-receita-associacao';
import { labelTipoReceita } from '@/domain/receitas/tipo-receita-labels';
import ConfigAtivoBadge from '@/components/Config/ConfigAtivoBadge';
import { Badge } from '@/components/ui/Badge';

type Props = {
  receitas: InsumoReceitaAssociacao[];
};

function formatQuantidade(value: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

export default function InsumoReceitasLista({ receitas }: Props) {
  if (receitas.length === 0) {
    return <p className="text-sm text-stone-500">Nenhuma receita usa este insumo.</p>;
  }

  return (
    <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
      {receitas.map((item) => (
        <li key={item.ingredienteId} className="px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-stone-900">{item.receitaNome}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <Badge tone="outline" pill={false}>
                  {labelTipoReceita(item.receitaTipo)}
                </Badge>
                {item.receitaCodigo ? (
                  <span className="font-mono text-xs text-stone-500">{item.receitaCodigo}</span>
                ) : null}
                <ConfigAtivoBadge ativo={item.receitaAtiva} />
              </div>
            </div>
            <p className="font-mono text-sm tabular-nums text-stone-700">
              {formatQuantidade(item.quantidadePadrao)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
