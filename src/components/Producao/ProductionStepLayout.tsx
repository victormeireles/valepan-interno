/**
 * Layout compartilhado para telas de etapas de produção
 */

import { ReactNode } from 'react';
import ProductionStepHeader from './ProductionStepHeader';

interface ProductionStepLayoutProps {
  etapaNome: string;
  loteCodigo: string;
  produtoNome: string;
  /** Linha do tempo / etapas (acima do conteúdo principal) */
  beforeContent?: ReactNode;
  children: ReactNode;
  /** Área abaixo do header (padding + espaço vertical entre blocos). Default: p-8 space-y-6 */
  contentClassName?: string;
  /** Header mais baixo e tipografia menor no mobile (telas de chão de fábrica) */
  denseHeader?: boolean;
  /** Container externo (ex.: margens em telas pequenas). Default: max-w-2xl mx-auto p-4 */
  outerClassName?: string;
}

export default function ProductionStepLayout({
  etapaNome,
  loteCodigo,
  produtoNome,
  beforeContent,
  children,
  contentClassName,
  denseHeader = false,
  outerClassName,
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
          dense={denseHeader}
        />
        <div className={content}>{children}</div>
      </div>
    </div>
  );
}







