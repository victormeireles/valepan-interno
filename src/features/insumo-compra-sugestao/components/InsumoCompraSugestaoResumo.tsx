import type { InsumoCompraSugestaoPageData } from '@/lib/services/insumo-compra-sugestao-service';

type Props = {
  resumo: InsumoCompraSugestaoPageData['resumo'];
};

export default function InsumoCompraSugestaoResumo({ resumo }: Props) {
  return (
    <div
      className="flex items-center gap-x-2 overflow-x-auto whitespace-nowrap text-sm text-stone-600"
      aria-label="Resumo das sugestões"
    >
      <ResumoItem value={resumo.urgentes} label="urgentes" className="text-rose-700" />
      <Separador />
      <ResumoItem value={resumo.pedirHoje} label="pedir hoje" className="text-amber-800" />
      <Separador />
      <ResumoItem value={resumo.foraJanela} label="fora da janela" className="text-amber-800" />
      <Separador />
      <ResumoItem value={resumo.adiarMin} label="aguardando lote mínimo" />
    </div>
  );
}

function ResumoItem({
  value,
  label,
  className = 'text-stone-700',
}: {
  value: number;
  label: string;
  className?: string;
}) {
  return (
    <span className={className}>
      <strong className="font-mono font-semibold tabular-nums">{value}</strong> {label}
    </span>
  );
}

function Separador() {
  return (
    <span className="text-stone-300" aria-hidden="true">
      •
    </span>
  );
}
