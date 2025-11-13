import { Quantidade } from '@/domain/types/inventario';

interface QuantidadeFormatterProps {
  label: string;
  anterior?: Quantidade;
  novo: Quantidade;
}

export function QuantidadeFormatter({
  label,
  anterior,
  novo,
}: QuantidadeFormatterProps) {
  const diff = anterior ? calcularDiferenca(anterior, novo) : novo;

  return (
    <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-3">
      <h4 className="text-xs uppercase tracking-wide text-gray-400 mb-2">
        {label}
      </h4>
      <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
        <QuantidadeLinha titulo="Caixas" valor={novo.caixas} diff={diff.caixas} />
        <QuantidadeLinha titulo="Pacotes" valor={novo.pacotes} diff={diff.pacotes} />
        <QuantidadeLinha titulo="Unidades" valor={novo.unidades} diff={diff.unidades} />
        <QuantidadeLinha titulo="Kg" valor={novo.kg} diff={diff.kg} />
      </div>
    </div>
  );
}

type QuantidadeLinhaProps = {
  titulo: string;
  valor: number;
  diff: number;
};

function QuantidadeLinha({ titulo, valor, diff }: QuantidadeLinhaProps) {
  const diffLabel = formatDiff(diff);
  const diffColor =
    diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-gray-400';

  return (
    <div className="flex flex-col">
      <span className="text-gray-400">{titulo}</span>
      <span className="font-semibold text-white">{formatNumber(valor)}</span>
      <span className={`${diffColor} text-[11px]`}>
        {diffLabel}
      </span>
    </div>
  );
}

function calcularDiferenca(anterior: Quantidade, novo: Quantidade): Quantidade {
  return {
    caixas: novo.caixas - anterior.caixas,
    pacotes: novo.pacotes - anterior.pacotes,
    unidades: novo.unidades - anterior.unidades,
    kg: parseFloat((novo.kg - anterior.kg).toFixed(3)),
  };
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2);
}

function formatDiff(value: number): string {
  if (value === 0) return '0';
  const sign = value > 0 ? '+' : '';
  const formatted = Number.isInteger(value) ? value.toString() : value.toFixed(2);
  return `${sign}${formatted}`;
}


