export type AutorJoin = { nome: string } | { nome: string }[] | null | undefined;

export type OperacaoAutor = {
  criadoPor: string | null;
  criadoPorNome: string | null;
};

export const SELECT_COM_AUTOR = '*, autor:usuarios!criado_por(nome)' as const;

export function selectComAutor(): typeof SELECT_COM_AUTOR {
  return SELECT_COM_AUTOR;
}

export function mapOperacaoAutor(
  criadoPor: string | null | undefined,
  join: AutorJoin,
): OperacaoAutor {
  const nested = Array.isArray(join) ? join[0] : join;
  const nome = nested?.nome?.trim();
  return {
    criadoPor: criadoPor ?? null,
    criadoPorNome: nome || null,
  };
}

export function primeiroNomeAutor(nome: string | null | undefined): string | null {
  const trimmed = nome?.trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0] ?? trimmed;
}
