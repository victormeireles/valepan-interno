'use client';

import { useMemo } from 'react';
import type { InsumoConversaoVisual } from '@/domain/types/insumo-estoque';
import { InsumoUnidadeConversao } from '@/domain/insumos/insumo-unidade-conversao';
import { InsumoUnidadeConversaoFormatter } from '@/domain/insumos/insumo-unidade-conversao-formatter';
import { Input } from '@/components/ui/Input';

type Props = {
  id: string;
  label: string;
  valueExibicao: string;
  onChangeExibicao: (value: string) => void;
  unidadeEstoque: string;
  conversao?: InsumoConversaoVisual | null;
  required?: boolean;
  min?: string;
  step?: string;
  hint?: string;
};

/**
 * Campo de quantidade na unidade de conferência (quando houver).
 * O valor digitado é o de exibição; use `parseExibicaoToEstoque` ao gravar.
 */
export class InsumoConversaoQuantidadeFieldParser {
  static parseExibicaoToEstoque(
    valueExibicao: string,
    conversao: InsumoConversaoVisual | null | undefined,
  ): number | null {
    const parsed = Number(valueExibicao.replace(',', '.'));
    if (Number.isNaN(parsed)) return null;
    return InsumoUnidadeConversao.fromConfig(conversao ?? null).toEstoque(parsed);
  }

  static estoqueToExibicaoString(
    quantidadeEstoque: number,
    conversao: InsumoConversaoVisual | null | undefined,
  ): string {
    const valor = InsumoUnidadeConversao.fromConfig(conversao ?? null).toExibicao(
      quantidadeEstoque,
    );
    return String(valor);
  }
}

export default function InsumoConversaoQuantidadeField({
  id,
  label,
  valueExibicao,
  onChangeExibicao,
  unidadeEstoque,
  conversao = null,
  required,
  min = '0',
  step = '0.001',
  hint,
}: Props) {
  const formatter = useMemo(
    () => InsumoUnidadeConversaoFormatter.create(unidadeEstoque, conversao),
    [unidadeEstoque, conversao],
  );

  const unidadeCampo = formatter.unidadeCampo();
  const parsed = Number(valueExibicao.replace(',', '.'));
  const equivalencia =
    conversao && Number.isFinite(parsed)
      ? formatter.formatEquivalenteEstoque(parsed)
      : null;

  const labelComUnidade = `${label} (${unidadeCampo})`;

  return (
    <div className="space-y-1.5">
      <Input
        id={id}
        label={labelComUnidade}
        type="number"
        step={step}
        min={min}
        numeric
        required={required}
        value={valueExibicao}
        onChange={(event) => onChangeExibicao(event.target.value)}
        hint={hint}
      />
      {equivalencia ? (
        <p className="font-mono text-xs tabular-nums text-stone-500" aria-live="polite">
          {equivalencia}
        </p>
      ) : null}
    </div>
  );
}
