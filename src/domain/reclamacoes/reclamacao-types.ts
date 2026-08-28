import type { ReclamacaoUnidade } from './reclamacao-unidade';
import type { OperacaoAutor } from '@/domain/auditoria/operacao-autor';

export type ReclamacaoCategoriaRecord = {
  id: string;
  nome: string;
  ordem: number;
  ativa: boolean;
  exigeObservacao: boolean;
};

export type ReclamacaoOpcao = {
  id: string;
  nome: string;
};

export type ReclamacaoFotoRecord = {
  id: string;
  storagePath: string;
  ordem: number;
  signedUrl: string | null;
};

export type ReclamacaoListFiltro = {
  clienteId: string | null;
  produtoId: string | null;
  categoriaId: string | null;
  dataProblemaDe: string | null;
  dataProblemaAte: string | null;
};

export type ReclamacaoListItem = {
  id: string;
  clienteId: string;
  clienteNome: string;
  produtoId: string;
  produtoNome: string;
  categoriaId: string;
  categoriaNome: string;
  categoriaExigeObservacao: boolean;
  observacao: string | null;
  dataFabricacao: string;
  dataProblema: string;
  quantidade: number;
  unidade: ReclamacaoUnidade;
  fotos: ReclamacaoFotoRecord[];
  createdAt: string;
} & OperacaoAutor;
