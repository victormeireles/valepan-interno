/**
 * Layout compartilhado para telas de etapas de produção
 */

import { ReactNode } from 'react';
import ProductionStepHeader from './ProductionStepHeader';

interface ProductionStepLayoutProps {
  etapaNome: string;
  loteCodigo: string;
  produtoNome: string;
  children: ReactNode;
}

export default function ProductionStepLayout({
  etapaNome,
  loteCodigo,
  produtoNome,
  children,
}: ProductionStepLayoutProps) {
  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
        <ProductionStepHeader
          etapaNome={etapaNome}
          loteCodigo={loteCodigo}
          produtoNome={produtoNome}
        />
        <div className="p-8 space-y-6">{children}</div>
      </div>
    </div>
  );
}




