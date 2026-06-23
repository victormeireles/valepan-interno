export type TipoEstoqueMarcaLetra = 'D' | 'T' | 'V';

export type TipoEstoqueMarca = {
  letra: TipoEstoqueMarcaLetra;
  label: string;
};

const TIPO_ESTOQUE_MARCA_POR_NOME: Record<string, TipoEstoqueMarcaLetra> = {
  damiao: 'D',
  'top alto': 'T',
};

function normalizeClienteNome(nome: string): string {
  return nome
    .trim()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/** Primeira letra do nome do cliente, para badge compacto (ex.: Damiao → D). */
export function getClienteInicial(nome: string): string {
  const trimmed = nome.trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0).toUpperCase();
}

/** Marca D/T à direita do produto (Damião, Top Alto). Valepan não exibe tag. */
export function resolveTipoEstoqueMarca(nome: string | undefined): TipoEstoqueMarca | null {
  if (!nome?.trim()) return null;

  const label = nome.trim();
  const letra = TIPO_ESTOQUE_MARCA_POR_NOME[normalizeClienteNome(label)];
  if (!letra) return null;

  return { letra, label };
}

/** Valepan é o padrão — sem badge e sem cliente repetido na meta da embalagem. */
export function shouldOmitClienteMetaEmbalagem(nome: string | undefined): boolean {
  if (!nome?.trim()) return false;
  return normalizeClienteNome(nome) === 'valepan';
}
