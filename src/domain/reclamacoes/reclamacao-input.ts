import { assertLimiteFotos } from './reclamacao-fotos-limite';
import {
  assertObservacaoCategoria,
  normalizarObservacao,
} from './reclamacao-observacao';
import { assertReclamacaoQuantidade } from './reclamacao-unidade';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type ReclamacaoSaveInput = {
  clienteId: string;
  produtoId: string;
  categoriaId: string;
  exigeObservacao: boolean;
  observacao: string | null | undefined;
  dataFabricacao: string;
  dataProblema: string;
  quantidade: number;
  unidade: string;
  fotosCount: number;
};

function idOk(value: string): boolean {
  return value.trim().length > 0;
}

export function validarReclamacaoSave(input: ReclamacaoSaveInput): string | null {
  if (!idOk(input.clienteId)) return 'Informe o cliente.';
  if (!idOk(input.produtoId)) return 'Informe o produto.';
  if (!idOk(input.categoriaId)) return 'Informe a categoria.';
  if (!ISO_DATE.test(input.dataFabricacao)) return 'Informe a data de fabricação.';
  if (!ISO_DATE.test(input.dataProblema)) return 'Informe a data do problema.';
  const qtd = assertReclamacaoQuantidade(input.quantidade, input.unidade);
  if (qtd) return qtd;
  const obs = normalizarObservacao(input.observacao);
  const obsErr = assertObservacaoCategoria(input.exigeObservacao, obs);
  if (obsErr) return obsErr;
  return assertLimiteFotos(input.fotosCount);
}
