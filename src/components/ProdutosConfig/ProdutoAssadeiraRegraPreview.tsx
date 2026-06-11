'use client';

import type { AssadeiraVinculoResolvido } from '@/domain/assadeiras/assadeira-resolver-types';

type Props = {
  vinculos: AssadeiraVinculoResolvido[];
};

export default function ProdutoAssadeiraRegraPreview({ vinculos }: Props) {
  if (vinculos.length === 0) return null;

  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <span className="material-icons text-blue-600 text-lg shrink-0" aria-hidden="true">
          rule
        </span>
        <div>
          <p className="text-sm font-semibold text-blue-900">Regra de categoria + peso</p>
          <p className="text-xs text-blue-800/80 mt-0.5">
            Este produto herda assadeira(s) pela regra. Para sobrescrever, vincule uma exceção
            manual abaixo.
          </p>
        </div>
      </div>
      <ul className="space-y-2">
        {vinculos.map((v) => (
          <li
            key={v.assadeira_id}
            className="flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm"
          >
            <span className="font-medium text-gray-900">{v.assadeira_nome}</span>
            <span className="tabular-nums text-gray-600 shrink-0">
              {v.unidades_efetivas} pães/assadeira
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
