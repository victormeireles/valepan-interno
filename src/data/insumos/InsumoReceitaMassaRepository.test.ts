import { describe, expect, it } from 'vitest';

type ReceitaJoin = {
  id: string;
  tipo: string;
  ativo: boolean | null;
};

type VinculoRow = {
  quantidade_por_produto: number;
  receitas: ReceitaJoin | ReceitaJoin[] | null;
};

function extrairReceita(raw: ReceitaJoin | ReceitaJoin[] | null): ReceitaJoin | null {
  const receita = Array.isArray(raw) ? raw[0] : raw;
  if (!receita || receita.ativo === false) return null;
  return receita;
}

function filtrarVinculosPorTipos(vinculos: VinculoRow[], tipos: string[]): VinculoRow[] {
  const tiposPermitidos = new Set(tipos);
  return vinculos.filter((vinculo) => {
    const receita = extrairReceita(vinculo.receitas);
    return receita !== null && tiposPermitidos.has(receita.tipo);
  });
}

describe('filtro de vínculos por tipo da receita', () => {
  it('retorna apenas vínculos cuja receita tem o tipo solicitado', () => {
    const vinculos: VinculoRow[] = [
      {
        quantidade_por_produto: 1173,
        receitas: { id: 'r1', tipo: 'massa', ativo: true },
      },
      {
        quantidade_por_produto: 14268,
        receitas: { id: 'r2', tipo: 'confeito', ativo: true },
      },
    ];

    const resultado = filtrarVinculosPorTipos(vinculos, ['massa']);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].quantidade_por_produto).toBe(1173);
  });

  it('ignora receitas inativas', () => {
    const vinculos: VinculoRow[] = [
      {
        quantidade_por_produto: 1173,
        receitas: { id: 'r1', tipo: 'massa', ativo: false },
      },
    ];

    expect(filtrarVinculosPorTipos(vinculos, ['massa'])).toHaveLength(0);
  });
});
