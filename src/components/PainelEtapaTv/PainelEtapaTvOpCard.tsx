'use client';

import type { EtapaProductItem } from '@/components/Realizado/etapa/types';
import EtapaProductTitle from '@/components/Realizado/etapa/EtapaProductTitle';
import { etapaStatusStyles, getEtapaProductionStatus } from '@/components/Realizado/etapa/etapa-status';
import { resolveTipoEstoqueMarca, shouldOmitClienteMetaEmbalagem } from '@/lib/utils/cliente-display';
import { QuantityBreakdown } from '@/domain/valueObjects/QuantityBreakdown';
import { Card } from '@/components/ui/Card';
import PainelEtapaTvResumoBarra from './PainelEtapaTvResumoBarra';

type PainelEtapaTvOpCardProps = {
  product: EtapaProductItem;
  showTipoEstoqueMarcaBadge?: boolean;
  caption?: string;
};

type StatusStyles = ReturnType<typeof etapaStatusStyles>;

function metaItemsOf(product: EtapaProductItem, showBadge: boolean): string[] {
  const omitCliente =
    showBadge &&
    (resolveTipoEstoqueMarca(product.cliente) ||
      shouldOmitClienteMetaEmbalagem(product.cliente));
  return [omitCliente ? null : product.cliente, product.observacao || null].filter(
    (item): item is string => Boolean(item),
  );
}

function quantityLabels(product: EtapaProductItem): { produced: string; target: string } {
  const unit = product.unidade ? product.unidade.toLowerCase() : undefined;
  return {
    produced: new QuantityBreakdown(product.detalhesProduzido).format(
      product.somaProduzido,
      unit,
    ),
    target: new QuantityBreakdown(product.detalhesMeta).format(product.somaAProduzir, unit),
  };
}

function OpCardBody({
  product,
  showTipoEstoqueMarcaBadge,
  styles,
  pct,
}: {
  product: EtapaProductItem;
  showTipoEstoqueMarcaBadge: boolean;
  styles: StatusStyles;
  pct: number;
}) {
  const { produced, target } = quantityLabels(product);
  const metaItems = metaItemsOf(product, showTipoEstoqueMarcaBadge);

  return (
    <div className="flex gap-2.5">
      <span
        className={['mt-[7px] h-[9px] w-[9px] shrink-0 rounded-full', styles.dot].join(' ')}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <EtapaProductTitle
          produto={product.produto}
          assadeira={product.assadeira}
          assadeiraCorHex={product.assadeiraCorHex}
          tipoEstoqueCliente={product.cliente}
          showTipoEstoqueMarcaBadge={showTipoEstoqueMarcaBadge}
          dataEtiqueta={product.dataEtiqueta}
          congelado={product.congelado}
          hasPhoto={product.hasPhoto}
        />
        {metaItems.length > 0 ? (
          <p className="mt-0.5 truncate text-xs text-text-muted" title={metaItems.join(' · ')}>
            {metaItems.join(' · ')}
          </p>
        ) : null}
        <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5 font-mono text-sm leading-snug tabular-nums">
          <span className="whitespace-nowrap">
            <strong className="text-text-strong">{produced}</strong>
            <span className="mx-1 text-stone-400">/</span>
            <span className="text-text-muted">{target}</span>
          </span>
          {product.horario ? (
            <span className="ml-auto text-xs text-text-muted">{product.horario}</span>
          ) : null}
        </p>
        <div className="mt-1.5">
          <PainelEtapaTvResumoBarra
            pct={pct}
            fillClass={styles.fill}
            label={`${product.produto}: ${pct}%`}
            size="turno"
          />
        </div>
      </div>
    </div>
  );
}

export default function PainelEtapaTvOpCard({
  product,
  showTipoEstoqueMarcaBadge = false,
  caption,
}: PainelEtapaTvOpCardProps) {
  const status = getEtapaProductionStatus(
    product.somaProduzido,
    product.somaAProduzir,
    product.productionStatusOverride,
  );
  const styles = etapaStatusStyles(status);
  const pct =
    product.somaAProduzir > 0
      ? Math.min(100, Math.round((product.somaProduzido / product.somaAProduzir) * 100))
      : 0;

  return (
    <Card padding="none" className="shrink-0 overflow-hidden shadow-control">
      <div className={['px-3 py-2', 'border-l-[3px]', styles.border].join(' ')}>
        {caption ? (
          <p className="mb-1 font-mono text-sm tabular-nums text-text-strong">{caption}</p>
        ) : null}
        <OpCardBody
          product={product}
          showTipoEstoqueMarcaBadge={showTipoEstoqueMarcaBadge}
          styles={styles}
          pct={pct}
        />
      </div>
    </Card>
  );
}
