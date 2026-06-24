'use client';

import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  formatCurrency,
  formatInsumoQuantidade,
} from '@/features/insumo-estoque/utils/formatters';
import {
  buildFatorConversaoHint,
  buildFatorConversaoLabel,
  buildSugestoesFatorConversao,
  formatUnidadeLabel,
  type InsumoSelecionadoResumo,
} from '@/features/insumo-estoque/utils/insumo-conversao-ui';

type Preview = {
  qtdNf: number;
  fator: number;
  qtdConvertida: number;
  custo: number;
};

type Props = {
  unidadeNf: string | null;
  descricaoOmie: string;
  insumo: InsumoSelecionadoResumo | null;
  fatorConversao: string;
  onFatorChange: (value: string) => void;
  preview: Preview | null;
  previewLabel?: string;
};

export default function InsumoResolverConversaoSection({
  unidadeNf,
  descricaoOmie,
  insumo,
  fatorConversao,
  onFatorChange,
  preview,
  previewLabel = 'Prévia da entrada',
}: Props) {
  const unidadeNfLabel = formatUnidadeLabel(unidadeNf, unidadeNf);
  const unidadeInsumoLabel = insumo
    ? formatUnidadeLabel(insumo.unidadeCodigo, insumo.unidadeNome)
    : null;

  const sugestoes =
    insumo && unidadeInsumoLabel
      ? buildSugestoesFatorConversao({
          descricaoOmie,
          unidadeNf,
          unidadeInsumo: unidadeInsumoLabel,
        })
      : [];

  const fatorLabel =
    insumo && unidadeInsumoLabel
      ? buildFatorConversaoLabel(unidadeNf ?? '', unidadeInsumoLabel)
      : 'Conteúdo por unidade da NF';

  const fatorHint =
    insumo && unidadeInsumoLabel
      ? buildFatorConversaoHint(unidadeNf ?? '', unidadeInsumoLabel)
      : 'Selecione um insumo para informar quanto cada unidade da nota representa no estoque';

  return (
    <div className="space-y-4">
      {insumo ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800/80">
            Insumo no estoque
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="font-medium text-stone-900">{insumo.nome}</p>
            <Badge tone="accent" numeric>
              {unidadeInsumoLabel}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-stone-600">
            Entradas serão registradas em{' '}
            <span className="font-mono font-medium text-stone-800">{unidadeInsumoLabel}</span>
          </p>
        </div>
      ) : null}

      <Input
        id="fator-conversao"
        label={fatorLabel}
        type="number"
        step="0.000001"
        min="0.000001"
        numeric
        required
        value={fatorConversao}
        onChange={(event) => onFatorChange(event.target.value)}
        hint={fatorHint}
        disabled={!insumo}
      />

      {insumo && sugestoes.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-stone-600">Atalhos de conversão</p>
          <div className="flex flex-wrap gap-2">
            {sugestoes.map((sugestao) => (
              <Chip
                key={`${sugestao.label}-${sugestao.value}`}
                active={Number(fatorConversao.replace(',', '.')) === sugestao.value}
                onClick={() => onFatorChange(String(sugestao.value))}
              >
                {sugestao.label}
              </Chip>
            ))}
          </div>
        </div>
      ) : null}

      {preview && insumo && unidadeInsumoLabel ? (
        <div
          className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm shadow-sm"
          role="status"
          aria-live="polite"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
            {previewLabel}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 font-mono tabular-nums text-stone-900">
            <span className="rounded-lg bg-stone-100 px-2.5 py-1.5">
              {formatInsumoQuantidade(preview.qtdNf, unidadeNfLabel)}
            </span>
            <span className="text-stone-400" aria-hidden="true">
              ×
            </span>
            <span className="rounded-lg bg-stone-100 px-2.5 py-1.5">
              {preview.fator.toLocaleString('pt-BR')}
            </span>
            <span className="material-icons text-base text-amber-600" aria-hidden="true">
              arrow_forward
            </span>
            <span className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 font-semibold text-amber-900">
              {formatInsumoQuantidade(preview.qtdConvertida, unidadeInsumoLabel)}
            </span>
          </div>
          <p className="mt-3 font-mono text-xs tabular-nums text-stone-600">
            Custo unitário no estoque:{' '}
            <span className="font-medium text-stone-800">
              {formatCurrency(preview.custo)}/{unidadeInsumoLabel}
            </span>
          </p>
        </div>
      ) : null}
    </div>
  );
}
