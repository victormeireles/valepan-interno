'use client';

import type { IntegracaoInsumoComEmpresa } from '@/domain/types/insumo-estoque-db';

type Props = {
  vinculos: IntegracaoInsumoComEmpresa[];
};

function formatFator(value: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  });
}

export default function InsumoVinculosOmieLista({ vinculos }: Props) {
  if (vinculos.length === 0) {
    return <p className="text-sm text-stone-500">Nenhum produto Omie vinculado.</p>;
  }

  return (
    <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
      {vinculos.map((vinculo) => (
        <li key={vinculo.id} className="px-4 py-3">
          <p className="font-medium text-stone-900">
            {vinculo.descricao_omie || `Produto ${vinculo.omie_id_produto}`}
          </p>
          <p className="mt-1 text-xs text-stone-600">{vinculo.empresaNome || '—'}</p>
          <div className="mt-2 flex flex-wrap gap-3 font-mono text-xs tabular-nums text-stone-600">
            <span>Cód. {vinculo.omie_codigo_produto || vinculo.omie_id_produto}</span>
            <span>Fator {formatFator(Number(vinculo.fator_conversao))}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
