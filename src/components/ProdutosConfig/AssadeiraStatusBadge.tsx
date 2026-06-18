'use client';

import type { ProdutoComAssadeirasResumo } from '@/domain/assadeiras/produto-assadeira-types';

type Props = {
  produto: Pick<
    ProdutoComAssadeirasResumo,
    'assadeiraOrigem' | 'assadeiraResolvidaCount' | 'semAssadeira'
  >;
};

export default function AssadeiraStatusBadge({ produto }: Props) {
  const count = produto.assadeiraResolvidaCount;
  const label =
    count === 1 ? 'assadeira' : 'assadeiras';

  if (produto.assadeiraOrigem === 'pendente' || produto.semAssadeira) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
        <span className="material-icons text-sm" aria-hidden="true">
          warning
        </span>
        Sem assadeira
      </span>
    );
  }

  if (produto.assadeiraOrigem === 'excecao') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-800 tabular-nums">
        <span className="material-icons text-sm" aria-hidden="true">
          edit_note
        </span>
        Exceção · {count} {label}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800 tabular-nums">
      <span className="material-icons text-sm" aria-hidden="true">
        rule
      </span>
      Regra · {count} {label}
    </span>
  );
}
