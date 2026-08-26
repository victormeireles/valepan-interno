'use client';

import type { InsumoConversaoVisual } from '@/domain/types/insumo-estoque';
import { InsumoUnidadeConversaoFormatter } from '@/domain/insumos/insumo-unidade-conversao-formatter';

type Props = {
  quantidadeEstoque: number;
  unidadeEstoque: string;
  conversao?: InsumoConversaoVisual | null;
  arredondado?: boolean;
  prefix?: string;
  className?: string;
  secundariaClassName?: string;
  showSecundaria?: boolean;
};

export default function InsumoQuantidadeConvertida({
  quantidadeEstoque,
  unidadeEstoque,
  conversao = null,
  arredondado = false,
  prefix,
  className = '',
  secundariaClassName = 'mt-0.5 font-mono text-xs tabular-nums text-stone-500',
  showSecundaria = true,
}: Props) {
  const formatter = InsumoUnidadeConversaoFormatter.create(unidadeEstoque, conversao);
  const exibida = formatter.formatQuantidade(quantidadeEstoque, { arredondado, prefix });

  return (
    <span className={className}>
      <span className="font-mono tabular-nums">{exibida.primaria}</span>
      {showSecundaria && exibida.secundaria ? (
        <span className={`block ${secundariaClassName}`}>{exibida.secundaria}</span>
      ) : null}
    </span>
  );
}
