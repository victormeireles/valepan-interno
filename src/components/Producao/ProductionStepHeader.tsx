/**
 * Header compartilhado para telas de etapas de produção
 */

interface ProductionStepHeaderProps {
  etapaNome: string;
  loteCodigo: string;
  produtoNome: string;
}

export default function ProductionStepHeader({
  etapaNome,
  loteCodigo,
  produtoNome,
}: ProductionStepHeaderProps) {
  return (
    <div className="bg-gray-50/50 px-8 py-6 border-b border-gray-100">
      <h2 className="text-2xl font-bold text-gray-900">Etapa: {etapaNome}</h2>
      <p className="text-sm text-gray-500">
        {loteCodigo} - {produtoNome}
      </p>
    </div>
  );
}




