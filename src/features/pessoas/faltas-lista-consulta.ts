import type { FaltaListaItem } from '@/app/actions/pessoas-faltas-actions';
import type { FaltaPessoaLinha } from '@/domain/pessoas/falta-agrupamento';
import { FaltaDatasRotulo } from '@/domain/pessoas/falta-datas-rotulo';
import {
  FaltaDocumentoFila,
  type FaltaDocumentoPeriodo,
  type SituacaoDocumento,
} from '@/domain/pessoas/falta-documento-fila';

const documentoFila = new FaltaDocumentoFila();
const datasRotulo = new FaltaDatasRotulo();

export type FiltroDocumento = 'enviar_hoje' | 'atrasado';

export type ContagemDocumento = {
  paraHoje: number;
  atrasados: number;
  paraHojeCodigos: Set<string>;
  atrasadosCodigos: Set<string>;
};

export function periodosDocumento(faltas: FaltaListaItem[], hoje: string): FaltaDocumentoPeriodo[] {
  return documentoFila.montar(faltas, hoje);
}

export function contarDocumento(periodos: FaltaDocumentoPeriodo[]): ContagemDocumento {
  const paraHoje = new Set<string>();
  const atrasados = new Set<string>();
  for (const periodo of periodos) {
    if (periodo.situacao === 'enviar_hoje') paraHoje.add(periodo.codigo);
    if (periodo.situacao === 'atrasado') atrasados.add(periodo.codigo);
  }
  return {
    paraHoje: paraHoje.size,
    atrasados: atrasados.size,
    paraHojeCodigos: paraHoje,
    atrasadosCodigos: atrasados,
  };
}

export function filtrarDocumento(
  pessoas: FaltaPessoaLinha[],
  documento: ContagemDocumento,
  filtro: FiltroDocumento | null,
): FaltaPessoaLinha[] {
  if (!filtro) return pessoas;
  const codigos = filtro === 'enviar_hoje' ? documento.paraHojeCodigos : documento.atrasadosCodigos;
  return pessoas.filter((pessoa) => codigos.has(pessoa.codigo));
}

export function rotuloPorPessoa(itens: FaltaListaItem[]): Map<string, string[]> {
  const datas = new Map<string, string[]>();
  for (const item of itens) {
    if (item.cancelada || !item.codigo) continue;
    const atuais = datas.get(item.codigo) ?? [];
    atuais.push(item.data);
    datas.set(item.codigo, atuais);
  }
  return new Map([...datas].map(([codigo, dias]) => [codigo, datasRotulo.listar(dias)]));
}

export function seloPorPessoa(
  pessoas: FaltaPessoaLinha[],
  periodos: FaltaDocumentoPeriodo[],
): Map<string, SituacaoDocumento> {
  const mapa = new Map<string, SituacaoDocumento>();
  for (const pessoa of pessoas) {
    const selo = documentoFila.selo(periodos, pessoa.codigo);
    if (selo) mapa.set(pessoa.codigo, selo);
  }
  return mapa;
}
