/**
 * Layout compartilhado para telas de etapas de produção
 */

import { ReactNode } from 'react';
import type { ProductionStep } from '@/domain/types/producao-etapas';
import ProductionStepHeader from './ProductionStepHeader';
import StepRegistrosDrawer from './StepRegistrosDrawer';

interface ProductionStepLayoutProps {
  etapaNome: string;
  loteCodigo: string;
  produtoNome: string;
  /** Repassado ao header; em Massa costuma ser false */
  showLoteProdutoSubtitle?: boolean;
  /** Link “Voltar” (canto superior esquerdo do header), ex. `filaUrlForProductionStep('massa')` */
  backHref?: string;
  /** Botão “Voltar” em vez de link (ex.: sair de overlay embutido no modal da fila). */
  onBackClick?: () => void;
  backLabel?: string;
  /** Linha do tempo / etapas (acima do conteúdo principal) */
  beforeContent?: ReactNode;
  children: ReactNode;
  /** Área abaixo do header (padding + espaço vertical entre blocos). Default: p-8 space-y-6 */
  contentClassName?: string;
  /** Header mais baixo e tipografia menor no mobile (telas de chão de fábrica) */
  denseHeader?: boolean;
  /** Container externo (ex.: margens em telas pequenas). Default: max-w-2xl mx-auto p-4 */
  outerClassName?: string;
  /** Painel «Registros» (lotes / lançamentos da etapa) — não polui o formulário principal. */
  registrosEtapa?: { ordemProducaoId: string; etapa: ProductionStep };
}

export default function ProductionStepLayout({
  etapaNome,
  loteCodigo,
  produtoNome,
  showLoteProdutoSubtitle = true,
  backHref,
  onBackClick,
  backLabel,
  beforeContent,
  children,
  contentClassName,
  denseHeader = false,
  outerClassName,
  registrosEtapa,
}: ProductionStepLayoutProps) {
  const content = contentClassName ?? 'p-8 space-y-6';
  const outer =
    outerClassName ?? 'max-w-2xl mx-auto p-4';

  return (
    <div className={outer}>
      {beforeContent}
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
        <ProductionStepHeader
          etapaNome={etapaNome}
          loteCodigo={loteCodigo}
          produtoNome={produtoNome}
          showLoteProdutoSubtitle={showLoteProdutoSubtitle}
          dense={denseHeader}
          backHref={backHref}
          onBackClick={onBackClick}
          backLabel={backLabel}
        />
        {registrosEtapa ? (
          <div className="flex justify-end border-b border-gray-100 bg-white px-3 py-2 sm:px-6">
            <StepRegistrosDrawer
              ordemProducaoId={registrosEtapa.ordemProducaoId}
              etapa={registrosEtapa.etapa}
            />
          </div>
        ) : null}
        <div className={content}>{children}</div>
      </div>
    </div>
  );
}







