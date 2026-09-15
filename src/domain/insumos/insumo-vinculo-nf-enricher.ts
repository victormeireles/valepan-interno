import type { InsumoEntradaNfResumo } from '@/data/insumos/InsumoMovimentoNfConsultaRepository';
import type { IntegracaoInsumoListItem } from '@/domain/types/insumo-estoque-db';

function buildVinculoKey(empresaId: string, insumoId: string): string {
  return `${empresaId}:${insumoId}`;
}

function groupNumerosNfPorVinculo(
  resumos: InsumoEntradaNfResumo[],
): Map<string, string[]> {
  const numerosPorVinculo = new Map<string, string[]>();

  for (const resumo of resumos) {
    if (!resumo.numeroNf) continue;
    const chave = buildVinculoKey(resumo.empresaId, resumo.insumoId);
    const numeros = numerosPorVinculo.get(chave) ?? [];
    numeros.push(resumo.numeroNf);
    numerosPorVinculo.set(chave, numeros);
  }

  return numerosPorVinculo;
}

export function enrichVinculosComEntradasNf(
  vinculos: IntegracaoInsumoListItem[],
  resumos: InsumoEntradaNfResumo[],
): IntegracaoInsumoListItem[] {
  const numerosPorVinculo = groupNumerosNfPorVinculo(resumos);

  return vinculos.map((vinculo) => {
    const chave = buildVinculoKey(vinculo.empresa_id, vinculo.insumo_id);
    const numerosExtras = numerosPorVinculo.get(chave) ?? [];
    const numerosNf = [...new Set([...vinculo.numerosNf, ...numerosExtras])];

    return {
      ...vinculo,
      numerosNf,
      nfsDistintas: numerosNf.length,
    };
  });
}
