import { Badge } from '@/components/ui/Badge';
import { ProximoVencimentoExperiencia } from '@/domain/pessoas/proximo-vencimento-experiencia';

const experiencia = new ProximoVencimentoExperiencia();

type Props = {
  dataAdmissao: string | null;
  hoje: string;
};

export function VencimentoExperienciaMarca({ dataAdmissao, hoje }: Props) {
  const proximo = experiencia.proximo(dataAdmissao, hoje);
  if (!proximo) return <span>—</span>;
  const texto = `${proximo.data} · ${proximo.prazo} dias`;
  if (proximo.diasRestantes > ProximoVencimentoExperiencia.ALERTA_DIAS) {
    return (
      <span className="font-mono tabular-nums" title={experiencia.legenda(proximo)}>
        {proximo.data}
        <span className="font-sans text-stone-500"> · {proximo.prazo} dias</span>
      </span>
    );
  }
  return (
    <Badge tone="warning" icon="schedule" title={experiencia.legenda(proximo)}>
      {texto}
    </Badge>
  );
}
