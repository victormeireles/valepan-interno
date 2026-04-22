/**
 * Header compartilhado para telas de etapas de produção
 */

interface ProductionStepHeaderProps {
  etapaNome: string;
  loteCodigo: string;
  produtoNome: string;
  /** Tipografia e padding menores no mobile */
  dense?: boolean;
}

export default function ProductionStepHeader({
  etapaNome,
  loteCodigo,
  produtoNome,
  dense = false,
}: ProductionStepHeaderProps) {
  return (
    <div
      className={
        dense
          ? 'bg-gray-50/50 border-b border-gray-100 px-4 py-3 sm:px-8 sm:py-6'
          : 'bg-gray-50/50 px-8 py-6 border-b border-gray-100'
      }
    >
      <h2
        className={
          dense
            ? 'text-lg font-bold leading-snug text-gray-900 sm:text-2xl'
            : 'text-2xl font-bold text-gray-900'
        }
      >
        Etapa: {etapaNome}
      </h2>
      <p
        className={
          dense
            ? 'mt-0.5 text-xs leading-snug text-gray-500 sm:text-sm'
            : 'text-sm text-gray-500'
        }
      >
        {loteCodigo} - {produtoNome}
      </p>
    </div>
  );
}







