export function normalizeCategoriaNome(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

/** Hambúrguer e Hot Dog sempre aparecem no painel de embalagem. */
export function isCategoriaSempreVisivelEmbalagem(nome: string): boolean {
  const normalized = normalizeCategoriaNome(nome);

  if (
    normalized.includes('hamburguer') ||
    normalized.includes('hamburger') ||
    normalized === 'hamburguer' ||
    normalized === 'hambúrguer'
  ) {
    return true;
  }

  if (
    normalized.includes('hot dog') ||
    normalized.includes('hotdog') ||
    normalized === 'hot dog'
  ) {
    return true;
  }

  return false;
}
