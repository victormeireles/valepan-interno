import { Badge } from '@/components/ui/Badge';
import { ExamePrazo, type ExameSituacao } from '@/domain/pessoas/exame-prazo';

export function ExamePrazoMarca({ situacao, silenciar = false }: { situacao: ExameSituacao; silenciar?: boolean }) {
  const prazo = new ExamePrazo();
  if (silenciar) {
    return <span>{situacao.proximo ? prazo.exibir(situacao.proximo) : '—'}</span>;
  }
  const legenda = prazo.legenda(situacao);
  if (situacao.alerta === 'vencido' && situacao.proximo) {
    return (
      <Badge tone="danger" icon="warning" title={legenda}>
        {prazo.exibir(situacao.proximo)}
      </Badge>
    );
  }
  if (situacao.alerta === 'proximo' && situacao.proximo) {
    return (
      <Badge tone="warning" icon="warning" title={legenda}>
        {prazo.exibir(situacao.proximo)}
      </Badge>
    );
  }
  if (situacao.alerta === 'sem_exame') {
    return (
      <Badge tone="warning" icon="warning" title={legenda}>
        Sem exame
      </Badge>
    );
  }
  return <span title={legenda}>{situacao.proximo ? prazo.exibir(situacao.proximo) : '—'}</span>;
}
