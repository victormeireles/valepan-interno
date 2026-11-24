import type { ColaboradorListaItem } from '@/domain/pessoas/colaborador-lista-filtro';
import { ExamePrazo } from '@/domain/pessoas/exame-prazo';
import { ProximoVencimentoExperiencia } from '@/domain/pessoas/proximo-vencimento-experiencia';
import { ExamePrazoMarca } from './ExamePrazoMarca';
import { VencimentoExperienciaMarca } from './VencimentoExperienciaMarca';

const experiencia = new ProximoVencimentoExperiencia();
const exames = new ExamePrazo();

type Props = {
  item: ColaboradorListaItem;
  hoje: string;
  onAbrirExames: (alvo: ColaboradorListaItem) => void;
};

export function PrazoColaborador({ item, hoje, onAbrirExames }: Props) {
  if (experiencia.proximo(item.dataAdmissao, hoje)) {
    return <VencimentoExperienciaMarca dataAdmissao={item.dataAdmissao} hoje={hoje} />;
  }
  return <ProximoExame item={item} hoje={hoje} onAbrir={onAbrirExames} />;
}

function ProximoExame({
  item,
  hoje,
  onAbrir,
}: {
  item: ColaboradorListaItem;
  hoje: string;
  onAbrir: (alvo: ColaboradorListaItem) => void;
}) {
  if (item.regime === 'pj') return <span>—</span>;
  return (
    <button
      type="button"
      className="inline-flex min-h-11 max-w-full cursor-pointer items-center border-none bg-transparent p-0 text-left"
      aria-label={`Exames de ${item.nome}`}
      onClick={(event) => {
        event.stopPropagation();
        onAbrir(item);
      }}
    >
      <ExamePrazoMarca situacao={exames.calcular(item.ultimoExame, hoje)} silenciar={item.situacao === 'desligado'} />
    </button>
  );
}
