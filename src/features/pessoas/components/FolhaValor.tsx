import { RemuneracaoCentavos } from '@/domain/pessoas/remuneracao-centavos';

const moeda = new RemuneracaoCentavos();

export function FolhaValor({ centavos, className = '' }: { centavos: number; className?: string }) {
  return <span className={`font-mono tabular-nums ${className}`}>{moeda.formatar(centavos)}</span>;
}
