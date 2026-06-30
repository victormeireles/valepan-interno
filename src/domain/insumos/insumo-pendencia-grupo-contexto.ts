import type { InsumoPendenciaComEmpresa } from '@/domain/types/insumo-estoque-db';

export type FornecedorResumo = {
  chave: string;
  label: string;
  pendenciaCount: number;
};

export type CategoriaResumo = {
  chave: string;
  label: string;
  pendenciaCount: number;
};

export type InsumoPendenciaGrupoContexto = {
  fornecedores: FornecedorResumo[];
  fornecedoresDistintos: number;
  fornecedorTitulo: string;
  fornecedorSubtitulo: string | null;
  categorias: CategoriaResumo[];
  categoriasDistintas: number;
  categoriaTitulo: string | null;
  categoriaSubtitulo: string | null;
  cfop: string | null;
  ncm: string | null;
};

function fornecedorLabel(pendencia: InsumoPendenciaComEmpresa): string | null {
  return (
    pendencia.fornecedor_nome?.trim() ||
    pendencia.fornecedor_razao_social?.trim() ||
    null
  );
}

function fornecedorChave(pendencia: InsumoPendenciaComEmpresa): string | null {
  const cnpj = pendencia.fornecedor_cnpj?.trim();
  if (cnpj) return cnpj;
  return fornecedorLabel(pendencia);
}

function categoriaLabel(pendencia: InsumoPendenciaComEmpresa): string | null {
  return pendencia.categoria_compra_descricao?.trim() || null;
}

function categoriaChave(pendencia: InsumoPendenciaComEmpresa): string | null {
  const codigo = pendencia.categoria_compra_codigo?.trim();
  if (codigo) return codigo;
  return categoriaLabel(pendencia);
}

function valorUnico(pendencias: InsumoPendenciaComEmpresa[], campo: 'cfop_entrada' | 'ncm_produto'): string | null {
  const valores = new Set(
    pendencias
      .map((pendencia) => pendencia[campo]?.trim())
      .filter((valor): valor is string => Boolean(valor)),
  );
  return valores.size === 1 ? [...valores][0]! : null;
}

function agregarResumos<T extends { chave: string; label: string; pendenciaCount: number }>(
  pendencias: InsumoPendenciaComEmpresa[],
  obterChave: (pendencia: InsumoPendenciaComEmpresa) => string | null,
  obterLabel: (pendencia: InsumoPendenciaComEmpresa) => string | null,
): T[] {
  const map = new Map<string, T>();

  for (const pendencia of pendencias) {
    const chave = obterChave(pendencia);
    const label = obterLabel(pendencia);
    if (!chave || !label) continue;

    const existing = map.get(chave);
    if (existing) {
      existing.pendenciaCount += 1;
      continue;
    }

    map.set(chave, { chave, label, pendenciaCount: 1 } as T);
  }

  return [...map.values()].sort((a, b) => b.pendenciaCount - a.pendenciaCount);
}

function montarTituloMultiplo(
  distintos: number,
  singular: string,
  itens: Array<{ label: string }>,
): { titulo: string; subtitulo: string | null } {
  const subtitulo = itens
    .slice(0, 2)
    .map((item) => item.label)
    .join(' • ');
  const sufixo = distintos > 2 ? ` • +${distintos - 2}` : '';

  return {
    titulo: `${distintos} ${singular}`,
    subtitulo: subtitulo + sufixo || null,
  };
}

export function buildPendenciaGrupoContexto(
  pendencias: InsumoPendenciaComEmpresa[],
): InsumoPendenciaGrupoContexto {
  const fornecedores = agregarResumos<FornecedorResumo>(
    pendencias,
    fornecedorChave,
    fornecedorLabel,
  );
  const fornecedoresDistintos = fornecedores.length;

  let fornecedorTitulo = 'Sem dados de fornecedor';
  let fornecedorSubtitulo: string | null = null;

  if (fornecedoresDistintos === 1) {
    fornecedorTitulo = fornecedores[0]!.label;
    if (fornecedores[0]!.pendenciaCount > 1) {
      fornecedorSubtitulo = `${fornecedores[0]!.pendenciaCount} recebimentos`;
    }
  } else if (fornecedoresDistintos > 1) {
    const multiplo = montarTituloMultiplo(fornecedoresDistintos, 'fornecedores', fornecedores);
    fornecedorTitulo = multiplo.titulo;
    fornecedorSubtitulo = multiplo.subtitulo;
  }

  const categorias = agregarResumos<CategoriaResumo>(
    pendencias,
    categoriaChave,
    categoriaLabel,
  );
  const categoriasDistintas = categorias.length;

  let categoriaTitulo: string | null = null;
  let categoriaSubtitulo: string | null = null;

  if (categoriasDistintas === 1) {
    categoriaTitulo = categorias[0]!.label;
    if (categorias[0]!.pendenciaCount > 1) {
      categoriaSubtitulo = `${categorias[0]!.pendenciaCount} recebimentos`;
    }
  } else if (categoriasDistintas > 1) {
    const multiplo = montarTituloMultiplo(categoriasDistintas, 'categorias', categorias);
    categoriaTitulo = multiplo.titulo;
    categoriaSubtitulo = multiplo.subtitulo;
  }

  return {
    fornecedores,
    fornecedoresDistintos,
    fornecedorTitulo,
    fornecedorSubtitulo,
    categorias,
    categoriasDistintas,
    categoriaTitulo,
    categoriaSubtitulo,
    cfop: valorUnico(pendencias, 'cfop_entrada'),
    ncm: valorUnico(pendencias, 'ncm_produto'),
  };
}
