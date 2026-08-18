import type { InsumoMovimentoRecord } from '@/domain/types/insumo-estoque';
import { Badge } from '@/components/ui/Badge';
import {
  formatCurrency,
  formatDateTime,
  formatInsumoQuantidade,
  origemMovimentoLabel,
  origemMovimentoTone,
} from '@/features/insumo-estoque/utils/formatters';

type Props = {
  movimento: InsumoMovimentoRecord;
  unidadeResumida: string;
  compact?: boolean;
};

export default function InsumoHistoricoMovimentoRow({
  movimento: mov,
  unidadeResumida,
  compact = false,
}: Props) {
  const deltaPositivo = mov.deltaQuantidade >= 0;

  return (
    <div className={`flex flex-col gap-2 ${compact ? 'py-2' : 'py-3'}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={origemMovimentoTone(mov.origem)}>
          {origemMovimentoLabel(mov.origem)}
        </Badge>
        <span className="text-xs text-stone-500">{formatDateTime(mov.createdAt)}</span>
        {mov.numeroNf ? (
          <span className="font-mono text-xs tabular-nums text-stone-500">
            NF {mov.numeroNf}
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p
          className={`font-mono text-sm font-semibold tabular-nums ${
            deltaPositivo ? 'text-emerald-700' : 'text-rose-700'
          }`}
        >
          {deltaPositivo ? '+' : ''}
          {formatInsumoQuantidade(mov.deltaQuantidade, unidadeResumida)}
        </p>
        <p className="font-mono text-xs tabular-nums text-stone-600">
          Saldo: {formatInsumoQuantidade(mov.saldoResultante, unidadeResumida)}
        </p>
      </div>
      <p className="font-mono text-xs tabular-nums text-stone-600">
        Custo: {formatCurrency(mov.custoUnitario)}
      </p>
      {mov.observacao ? <p className="text-sm text-stone-600">{mov.observacao}</p> : null}
    </div>
  );
}
