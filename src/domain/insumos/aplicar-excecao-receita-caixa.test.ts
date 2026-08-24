import { describe, expect, it } from 'vitest';
import {
  AVISO_EXCECAO_CAIXA_SEM_RECEITA_PRODUTO,
  aplicarExcecaoReceitaCaixa,
} from './aplicar-excecao-receita-caixa';
import type { InsumoReceitaTipoContexto } from '@/domain/insumos/insumo-consumo-producao-types';

const base: InsumoReceitaTipoContexto[] = [
  {
    tipo: 'embalagem',
    quantidadePorProduto: 4,
    ingredientes: [{ insumoId: 'plastico', quantidadePadrao: 1 }],
  },
  {
    tipo: 'caixa',
    quantidadePorProduto: 48,
    ingredientes: [{ insumoId: 'caixa-valepan', quantidadePadrao: 1 }],
  },
];

const excecao = [{ insumoId: 'caixa-damiao', quantidadePadrao: 1 }];

describe('aplicarExcecaoReceitaCaixa', () => {
  it('sem exceção devolve a lista igual', () => {
    const r = aplicarExcecaoReceitaCaixa(base, null);
    expect(r.receitas).toEqual(base);
    expect(r.avisos).toEqual([]);
  });

  it('com exceção troca só ingredientes da caixa e preserva qpp', () => {
    const r = aplicarExcecaoReceitaCaixa(base, excecao);
    const caixa = r.receitas.find((item) => item.tipo === 'caixa');
    const embalagem = r.receitas.find((item) => item.tipo === 'embalagem');
    expect(caixa?.ingredientes).toEqual(excecao);
    expect(caixa?.quantidadePorProduto).toBe(48);
    expect(embalagem).toEqual(base[0]);
    expect(r.avisos).toEqual([]);
  });

  it('sem receita de caixa no produto ignora a exceção e avisa', () => {
    const soEmbalagem = [base[0]];
    const r = aplicarExcecaoReceitaCaixa(soEmbalagem, excecao);
    expect(r.receitas).toEqual(soEmbalagem);
    expect(r.avisos).toEqual([AVISO_EXCECAO_CAIXA_SEM_RECEITA_PRODUTO]);
  });
});
