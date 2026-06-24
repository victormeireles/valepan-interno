import type { InsumoPendenciaComEmpresa } from '@/domain/types/insumo-estoque-db';

export type FornecedorResumo = {
  chave: string;
  label: string;
  pendenciaCount: number;
};

export type InsumoPendenciaGrupoContexto = {
  fornecedores: FornecedorResumo[];
  fornecedoresDistintos: number;
  fornecedorTitulo: string;
  fornecedorSubtitulo: string | null;
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

function valorUnico(pendencias: InsumoPendenciaComEmpresa[], campo: 'cfop_entrada' | 'ncm_produto'): string | null {
  const valores = new Set(
    pendencias
      .map((pendencia) => pendencia[campo]?.trim())
      .filter((valor): valor is string => Boolean(valor)),
  );
  return valores.size === 1 ? [...valores][0]! : null;
}

export function buildPendenciaGrupoContexto(
  pendencias: InsumoPendenciaComEmpresa[],
): InsumoPendenciaGrupoContexto {
  const fornecedorMap = new Map<string, FornecedorResumo>();

  for (const pendencia of pendencias) {
    const chave = fornecedorChave(pendencia);
    const label = fornecedorLabel(pendencia);
    if (!chave || !label) continue;

    const existing = fornecedorMap.get(chave);
    if (existing) {
      existing.pendenciaCount += 1;
      continue;
    }

    fornecedorMap.set(chave, { chave, label, pendenciaCount: 1 });
  }

  const fornecedores = [...fornecedorMap.values()].sort(
    (a, b) => b.pendenciaCount - a.pendenciaCount,
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
    fornecedorTitulo = `${fornecedoresDistintos} fornecedores`;
    fornecedorSubtitulo = fornecedores
      .slice(0, 2)
      .map((fornecedor) => fornecedor.label)
      .join(' • ');
    if (fornecedoresDistintos > 2) {
      fornecedorSubtitulo += ` • +${fornecedoresDistintos - 2}`;
    }
  }

  return {
    fornecedores,
    fornecedoresDistintos,
    fornecedorTitulo,
    fornecedorSubtitulo,
    cfop: valorUnico(pendencias, 'cfop_entrada'),
    ncm: valorUnico(pendencias, 'ncm_produto'),
  };
}
