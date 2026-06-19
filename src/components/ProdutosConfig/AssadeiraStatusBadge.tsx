'use client';

import type { ProdutoComAssadeirasResumo } from '@/domain/assadeiras/produto-assadeira-types';
import { configTableDenseBadgeClass } from '@/components/Config/config-table-styles';
import { Badge } from '@/components/ui/Badge';

type Props = {
  produto: Pick<
    ProdutoComAssadeirasResumo,
    'assadeiraOrigem' | 'assadeiraResolvidaCount' | 'semAssadeira'
  >;
  dense?: boolean;
};

export default function AssadeiraStatusBadge({ produto, dense = false }: Props) {
  const count = produto.assadeiraResolvidaCount;
  const label = count === 1 ? 'assadeira' : 'assadeiras';
  const denseClass = dense ? configTableDenseBadgeClass : '';

  if (produto.assadeiraOrigem === 'pendente' || produto.semAssadeira) {
    return (
      <Badge tone="warning" icon="warning" className={denseClass}>
        Sem assadeira
      </Badge>
    );
  }

  if (produto.assadeiraOrigem === 'excecao') {
    return (
      <Badge tone="accent" icon="edit_note" numeric className={denseClass}>
        Exceção · {count} {label}
      </Badge>
    );
  }

  return (
    <Badge tone="outline" icon="rule" numeric className={denseClass}>
      Regra · {count} {label}
    </Badge>
  );
}
