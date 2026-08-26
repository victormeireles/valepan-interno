import type {
  InsumoConversaoVisual,
  InsumoMovimentoRecord,
} from '@/domain/types/insumo-estoque';
import { Badge } from '@/components/ui/Badge';
import {
  formatCurrency,
  formatDateTime,
  origemMovimentoLabel,
  origemMovimentoTone,
} from '@/features/insumo-estoque/utils/formatters';
import InsumoQuantidadeConvertida from '@/features/insumo-estoque/components/InsumoQuantidadeConvertida';

type Props = {
  movimento: InsumoMovimentoRecord;
  unidadeResumida: string;
  conversao?: InsumoConversaoVisual | null;
  compact?: boolean;
};

export default function InsumoHistoricoMovimentoRow({
  movimento: mov,
  unidadeResumida,
  conversao = null,
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
        <div
          className={`text-sm font-semibold ${
            deltaPositivo ? 'text-emerald-700' : 'text-rose-700'
          }`}
        >
          <InsumoQuantidadeConvertida
            quantidadeEstoque={mov.deltaQuantidade}
            unidadeEstoque={unidadeResumida}
            conversao={conversao}
            prefix={deltaPositivo ? '+' : ''}
          />
        </div>
        <div className="text-xs text-stone-600">
          <span className="mr-1">Saldo:</span>
          <InsumoQuantidadeConvertida
            quantidadeEstoque={mov.saldoResultante}
            unidadeEstoque={unidadeResumida}
            conversao={conversao}
            showSecundaria={Boolean(conversao)}
            secundariaClassName="inline font-mono text-xs tabular-nums text-stone-500 before:content-['('] after:content-[')'] before:mr-0.5 after:ml-0.5"
          />
        </div>
      </div>
      <p className="font-mono text-xs tabular-nums text-stone-600">
        Custo: {formatCurrency(mov.custoUnitario)}
      </p>
      {mov.observacao ? <p className="text-sm text-stone-600">{mov.observacao}</p> : null}
    </div>
  );
}
