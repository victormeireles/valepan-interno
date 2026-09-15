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
  const qtdNf =
    detalhe.quantidadeNf != null
      ? formatInsumoQuantidade(detalhe.quantidadeNf, unidadeNfLabel)
      : null;
  const qtdEstoque =
    detalhe.quantidadeEstoque != null
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
        {detalhe.valorItem != null ? (
          <p className="font-mono text-xs tabular-nums text-stone-500">
            {formatCurrency(Number(detalhe.valorItem))}
          </p>
        ) : null}
      </div>

      {qtdNf || qtdEstoque ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-xs tabular-nums">
          {qtdNf ? (
            <span className="rounded-lg bg-stone-100 px-2 py-1 text-stone-800" title="Quantidade na NF">
              {qtdNf}
              <span className="ml-1 font-sans text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                NF
              </span>
            </span>
          ) : null}
          {qtdNf && qtdEstoque ? (
            <span className="material-icons text-sm text-amber-600" aria-hidden="true">
              arrow_forward
            </span>
          ) : null}
          {qtdEstoque ? (
            <span
              className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 font-semibold text-amber-900"
              title="Quantidade no estoque após fator"
            >
              {qtdEstoque}
              <span className="ml-1 font-sans text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                estoque
              </span>
            </span>
          ) : null}
        </div>
      ) : null}

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
    </div>
  );
}
