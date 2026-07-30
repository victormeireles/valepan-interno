import { normalizarCnpj } from '@/domain/insumos/insumo-cnpj';

export function resolverCnpjUnicoDoGrupo(grupo: {
  contexto: { fornecedores: { chave: string }[] };
}): string | null {
  if (grupo.contexto.fornecedores.length !== 1) return null;
  return normalizarCnpj(grupo.contexto.fornecedores[0]!.chave);
}
