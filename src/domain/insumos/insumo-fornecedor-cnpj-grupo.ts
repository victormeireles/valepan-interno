import { normalizarCnpj } from '@/domain/insumos/insumo-cnpj';

export function resolverCnpjUnicoDoGrupo(grupo: {
  contexto: { fornecedores: { chave: string }[] };
}): string | null {
  const digits = new Set<string>();
  for (const fornecedor of grupo.contexto.fornecedores) {
    const cnpj = normalizarCnpj(fornecedor.chave);
    if (cnpj) digits.add(cnpj);
  }
  if (digits.size !== 1) return null;
  return [...digits][0]!;
}
