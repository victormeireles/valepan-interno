'use client';

import type { InsumoNfDetalhe } from '@/domain/insumos/insumo-nf-detalhe';
import { insumoNfDetalheStatusLabel } from '@/domain/insumos/insumo-nf-detalhe';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import {
  formatCurrency,
  formatDate,
  formatInsumoQuantidade,
} from '@/features/insumo-estoque/utils/formatters';
import { formatUnidadeLabel } from '@/features/insumo-estoque/utils/insumo-conversao-ui';

type Props = {
  detalhe: InsumoNfDetalhe;
  mostrarFornecedor?: boolean;
};

function statusTone(status: InsumoNfDetalhe['status']): BadgeTone {
  switch (status) {
    case 'pendente':
      return 'warning';
    case 'resolvido':
      return 'accent';
    case 'lancada':
      return 'success';
    default:
      return 'neutral';
  }
}

export default function InsumoNfDetalheItem({
  detalhe,
  mostrarFornecedor = true,
}: Props) {
  const unidadeNfLabel = formatUnidadeLabel(detalhe.unidadeNf, detalhe.unidadeNf);
  const unidadeEstoqueLabel = formatUnidadeLabel(
    detalhe.unidadeEstoque,
    detalhe.unidadeEstoque,
  );
  const conversaoEstoque =
    detalhe.quantidadeNf != null &&
    detalhe.quantidadeEstoque != null &&
    detalhe.unidadeEstoque
      ? formatInsumoQuantidade(detalhe.quantidadeEstoque, unidadeEstoqueLabel)
      : null;

  const quantidadePrincipal =
    detalhe.quantidadeNf != null
      ? formatInsumoQuantidade(detalhe.quantidadeNf, unidadeNfLabel)
      : detalhe.quantidadeEstoque != null
        ? formatInsumoQuantidade(detalhe.quantidadeEstoque, unidadeEstoqueLabel)
        : null;

  return (
    <div className="text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-stone-900">NF {detalhe.numeroNf || '—'}</p>
            <Badge tone={statusTone(detalhe.status)} pill={false}>
              {insumoNfDetalheStatusLabel(detalhe.status)}
            </Badge>
          </div>
          <p className="text-xs text-stone-500">{formatDate(detalhe.data)}</p>
        </div>
        <div className="text-right">
          {quantidadePrincipal ? (
            <p className="font-mono tabular-nums text-stone-800">{quantidadePrincipal}</p>
          ) : null}
          {detalhe.valorItem != null ? (
            <p className="font-mono text-xs tabular-nums text-stone-500">
              {formatCurrency(Number(detalhe.valorItem))}
            </p>
          ) : null}
        </div>
      </div>

      {mostrarFornecedor && detalhe.fornecedor ? (
        <p className="mt-1.5 truncate text-xs text-stone-600" title={detalhe.fornecedor}>
          {detalhe.fornecedor}
        </p>
      ) : null}

      {detalhe.insumoNome ? (
        <p className="mt-1 truncate text-xs text-stone-600" title={detalhe.insumoNome}>
          {detalhe.insumoNome}
        </p>
      ) : null}

      {detalhe.cfop || detalhe.ncm ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {detalhe.cfop ? (
            <Badge tone="outline" pill={false}>
              CFOP {detalhe.cfop}
            </Badge>
          ) : null}
          {detalhe.ncm ? (
            <Badge tone="outline" pill={false}>
              NCM {detalhe.ncm}
            </Badge>
          ) : null}
        </div>
      ) : null}

      {conversaoEstoque ? (
        <p className="mt-1 font-mono text-xs tabular-nums text-amber-800">
          → {conversaoEstoque}
        </p>
      ) : null}
    </div>
  );
}
