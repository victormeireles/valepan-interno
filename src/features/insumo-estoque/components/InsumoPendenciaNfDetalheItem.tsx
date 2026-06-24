'use client';

import type { InsumoPendenciaComEmpresa } from '@/domain/types/insumo-estoque-db';
import { Badge } from '@/components/ui/Badge';
import {
  formatCurrency,
  formatDate,
  formatInsumoQuantidade,
} from '@/features/insumo-estoque/utils/formatters';
import { formatUnidadeLabel } from '@/features/insumo-estoque/utils/insumo-conversao-ui';

type Props = {
  pendencia: InsumoPendenciaComEmpresa;
  unidadeNf: string | null;
  mostrarFornecedor?: boolean;
  conversaoEstoque?: string | null;
};

function fornecedorLinha(pendencia: InsumoPendenciaComEmpresa): string | null {
  return (
    pendencia.fornecedor_nome?.trim() ||
    pendencia.fornecedor_razao_social?.trim() ||
    null
  );
}

export default function InsumoPendenciaNfDetalheItem({
  pendencia,
  unidadeNf,
  mostrarFornecedor = true,
  conversaoEstoque = null,
}: Props) {
  const unidadeNfLabel = formatUnidadeLabel(unidadeNf, unidadeNf);
  const fornecedor = fornecedorLinha(pendencia);

  return (
    <div className="text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-stone-900">NF {pendencia.numero_nf || '—'}</p>
          <p className="text-xs text-stone-500">{formatDate(pendencia.data_emissao_nf)}</p>
        </div>
        <div className="text-right">
          <p className="font-mono tabular-nums text-stone-800">
            {formatInsumoQuantidade(Number(pendencia.quantidade_nf), unidadeNfLabel)}
          </p>
          <p className="font-mono text-xs tabular-nums text-stone-500">
            {formatCurrency(Number(pendencia.valor_total_item))}
          </p>
        </div>
      </div>

      {mostrarFornecedor && fornecedor ? (
        <p className="mt-1.5 truncate text-xs text-stone-600" title={fornecedor}>
          {fornecedor}
        </p>
      ) : null}

      {pendencia.cfop_entrada || pendencia.ncm_produto ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {pendencia.cfop_entrada ? (
            <Badge tone="outline" pill={false}>
              CFOP {pendencia.cfop_entrada}
            </Badge>
          ) : null}
          {pendencia.ncm_produto ? (
            <Badge tone="outline" pill={false}>
              NCM {pendencia.ncm_produto}
            </Badge>
          ) : null}
        </div>
      ) : null}

      {conversaoEstoque ? (
        <p className="mt-1 font-mono text-xs tabular-nums text-amber-800">→ {conversaoEstoque}</p>
      ) : null}
    </div>
  );
}
