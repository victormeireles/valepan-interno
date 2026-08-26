'use client';

import { useId, useState } from 'react';
import type {
  InsumoConversaoVisual,
  InsumoMovimentoRecord,
} from '@/domain/types/insumo-estoque';
import {
  formatarRotuloBlocoSaida,
  InsumoHistoricoBlocoResumoBuilder,
} from '@/domain/insumos/insumo-historico-bloco-label';
import { Badge } from '@/components/ui/Badge';
import {
  origemMovimentoLabel,
  origemMovimentoTone,
} from '@/features/insumo-estoque/utils/formatters';
import InsumoHistoricoMovimentoRow from './InsumoHistoricoMovimentoRow';
import InsumoQuantidadeConvertida from './InsumoQuantidadeConvertida';

type Props = {
  movimentos: InsumoMovimentoRecord[];
  unidadeResumida: string;
  conversao?: InsumoConversaoVisual | null;
};

const resumoBuilder = new InsumoHistoricoBlocoResumoBuilder();

export default function InsumoHistoricoBlocoRow({
  movimentos,
  unidadeResumida,
  conversao = null,
}: Props) {
  const [aberto, setAberto] = useState(false);
  const painelId = useId();
  const resumo = resumoBuilder.build(movimentos);
  const deltaPositivo = resumo.deltaQuantidade >= 0;

  return (
    <div className="py-3">
      <button
        type="button"
        className="flex min-h-11 w-full flex-col gap-2 rounded-xl px-1 text-left hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
        aria-expanded={aberto}
        aria-controls={painelId}
        onClick={() => setAberto((valor) => !valor)}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={origemMovimentoTone(resumo.origemBadge)}>
            {origemMovimentoLabel(resumo.origemBadge)}
          </Badge>
          <span className="text-sm text-stone-700">{formatarRotuloBlocoSaida(movimentos)}</span>
          <span className="material-icons ml-auto text-stone-400" aria-hidden>
            {aberto ? 'expand_less' : 'expand_more'}
          </span>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div
            className={`text-sm font-semibold ${
              deltaPositivo ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            <InsumoQuantidadeConvertida
              quantidadeEstoque={resumo.deltaQuantidade}
              unidadeEstoque={unidadeResumida}
              conversao={conversao}
              prefix={deltaPositivo ? '+' : ''}
            />
          </div>
          <div className="text-xs text-stone-600">
            <span className="mr-1">Saldo:</span>
            <InsumoQuantidadeConvertida
              quantidadeEstoque={resumo.saldoResultante}
              unidadeEstoque={unidadeResumida}
              conversao={conversao}
              showSecundaria={Boolean(conversao)}
              secundariaClassName="inline font-mono text-xs tabular-nums text-stone-500 before:content-['('] after:content-[')'] before:mr-0.5 after:ml-0.5"
            />
          </div>
        </div>
      </button>

      {aberto ? (
        <ul
          id={painelId}
          className="mt-2 divide-y divide-stone-100 rounded-xl border border-stone-200 bg-stone-50 px-3"
        >
          {movimentos.map((mov) => (
            <li key={mov.id}>
              <InsumoHistoricoMovimentoRow
                movimento={mov}
                unidadeResumida={unidadeResumida}
                conversao={conversao}
                compact
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
