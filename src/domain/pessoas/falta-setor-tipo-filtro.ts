import type { SetorTipo } from './setor-edicao';

export type FaltaSetorTipoFiltroValor = 'todos' | SetorTipo;

export const FALTA_SETOR_TIPO_PADRAO: FaltaSetorTipoFiltroValor = 'todos';

export const FALTA_SETOR_TIPO_OPCOES: { value: FaltaSetorTipoFiltroValor; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'operacional', label: 'Operacional' },
  { value: 'apoio', label: 'Apoio' },
];

type ComSetorTipo = { setorTipo: SetorTipo | null };

export class FaltaSetorTipoFiltro {
  aplicar<T extends ComSetorTipo>(itens: T[], valor: FaltaSetorTipoFiltroValor): T[] {
    if (valor === 'todos') return itens;
    return itens.filter((item) => item.setorTipo === valor);
  }
}
