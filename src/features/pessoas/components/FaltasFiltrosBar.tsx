import { Input } from '@/components/ui/Input';
import type { FaltaSetorTipoFiltroValor } from '@/domain/pessoas/falta-setor-tipo-filtro';
import type { FaltaSituacaoFiltroValor } from '@/domain/pessoas/falta-situacao-filtro';
import { FaltasClassificacaoFiltro } from './FaltasClassificacaoFiltro';
import { FaltasSetorTipoFiltro } from './FaltasSetorTipoFiltro';
import { FaltasSituacaoFiltro } from './FaltasSituacaoFiltro';

type Props = {
  inicio: string;
  fim: string;
  situacao: FaltaSituacaoFiltroValor;
  setorTipo: FaltaSetorTipoFiltroValor;
  classificacao: string;
  termo: string;
  onPeriodo: (inicio: string, fim: string) => void;
  onSituacao: (valor: FaltaSituacaoFiltroValor) => void;
  onSetorTipo: (valor: FaltaSetorTipoFiltroValor) => void;
  onClassificacao: (valor: string) => void;
  onTermo: (valor: string) => void;
};

export function FaltasFiltrosBar({
  inicio,
  fim,
  situacao,
  setorTipo,
  classificacao,
  termo,
  onPeriodo,
  onSituacao,
  onSetorTipo,
  onClassificacao,
  onTermo,
}: Props) {
  return (
    <div className="grid grid-cols-2 items-end gap-3 pt-4 lg:grid-cols-3 xl:grid-cols-6">
      <Input
        key={`de-${inicio}`}
        label="De"
        type="date"
        defaultValue={inicio}
        onChange={(event) => onPeriodo(event.target.value, fim)}
      />
      <Input
        key={`ate-${fim}`}
        label="Até"
        type="date"
        defaultValue={fim}
        onChange={(event) => onPeriodo(inicio, event.target.value)}
      />
      <FaltasSituacaoFiltro value={situacao} onChange={onSituacao} />
      <FaltasSetorTipoFiltro value={setorTipo} onChange={onSetorTipo} />
      <FaltasClassificacaoFiltro value={classificacao} onChange={onClassificacao} />
      <Input
        label="Busca"
        aria-label="Buscar falta"
        placeholder="Nome"
        icon="search"
        value={termo}
        onChange={(event) => onTermo(event.target.value)}
      />
    </div>
  );
}
