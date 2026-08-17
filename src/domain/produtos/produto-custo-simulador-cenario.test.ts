import { describe, expect, it } from 'vitest';
import { ProdutoCustoSimuladorCenario } from './produto-custo-simulador-cenario';
import type {
  ProdutoCustoReceitaCatalogoItem,
  ProdutoCustoVinculo,
} from './produto-custo-unitario-types';

const cenario = new ProdutoCustoSimuladorCenario();

const massaAtual: ProdutoCustoVinculo = {
  tipo: 'massa',
  receitaId: 'r-massa',
  receitaNome: 'HB Padrão',
  quantidadePorProduto: 953,
  ingredientes: [
    {
      insumoId: 'farinha',
      insumoNome: 'Farinha',
      unidade: 'kg',
      quantidadePadrao: 10,
      custoUnitario: 5,
    },
  ],
};

const caixaAtual: ProdutoCustoVinculo = {
  tipo: 'caixa',
  receitaId: 'r-caixa-40',
  receitaNome: 'Caixa Valepan',
  quantidadePorProduto: 40,
  ingredientes: [
    {
      insumoId: 'papelão',
      insumoNome: 'Papelão',
      unidade: 'un',
      quantidadePadrao: 1,
      custoUnitario: 2,
    },
  ],
};

const catalogo: ProdutoCustoReceitaCatalogoItem[] = [
  {
    id: 'r-massa',
    nome: 'HB Padrão',
    tipo: 'massa',
    ingredientes: massaAtual.ingredientes,
  },
  {
    id: 'r-caixa-40',
    nome: 'Caixa Valepan',
    tipo: 'caixa',
    ingredientes: caixaAtual.ingredientes,
  },
  {
    id: 'r-caixa-48',
    nome: 'Caixa 48',
    tipo: 'caixa',
    ingredientes: [
      {
        insumoId: 'papelão',
        insumoNome: 'Papelão',
        unidade: 'un',
        quantidadePadrao: 1,
        custoUnitario: 2.4,
      },
    ],
  },
  {
    id: 'r-pacote-6',
    nome: 'Pacote C/ 6',
    tipo: 'embalagem',
    ingredientes: [
      {
        insumoId: 'filme',
        insumoNome: 'Filme',
        unidade: 'un',
        quantidadePadrao: 1,
        custoUnitario: 0.1,
      },
    ],
  },
];

describe('ProdutoCustoSimuladorCenario', () => {
  it('selecaoInicial copia vínculos atuais', () => {
    const selecao = cenario.selecaoInicial([massaAtual, caixaAtual]);
    expect(selecao.massa).toEqual({ receitaId: 'r-massa', quantidade: 953 });
    expect(selecao.caixa).toEqual({ receitaId: 'r-caixa-40', quantidade: 40 });
  });

  it('override de qtd e troca de receita montam o Depois', () => {
    const depois = cenario.montarDepois({
      vinculosAntes: [massaAtual, caixaAtual],
      catalogo,
      selecao: {
        massa: { receitaId: 'r-massa', quantidade: 715 },
        caixa: { receitaId: 'r-caixa-48', quantidade: 48 },
        embalagem: { receitaId: 'r-pacote-6', quantidade: 6 },
      },
    });

    expect(depois).toHaveLength(3);
    expect(depois.find((item) => item.tipo === 'massa')?.quantidadePorProduto).toBe(715);
    expect(depois.find((item) => item.tipo === 'caixa')?.receitaId).toBe('r-caixa-48');
    expect(depois.find((item) => item.tipo === 'embalagem')?.receitaNome).toBe('Pacote C/ 6');
  });

  it('receita vazia no Depois omite o tipo', () => {
    const depois = cenario.montarDepois({
      vinculosAntes: [massaAtual, caixaAtual],
      catalogo,
      selecao: {
        massa: { receitaId: 'r-massa', quantidade: 953 },
        caixa: { receitaId: '', quantidade: 40 },
      },
    });
    expect(depois.map((item) => item.tipo)).toEqual(['massa']);
  });

  it('coletarInsumos une Antes e Depois sem duplicar insumo', () => {
    const depois = cenario.montarDepois({
      vinculosAntes: [massaAtual],
      catalogo,
      selecao: {
        massa: { receitaId: 'r-massa', quantidade: 953 },
        embalagem: { receitaId: 'r-pacote-6', quantidade: 6 },
      },
    });
    const insumos = cenario.coletarInsumos([massaAtual], depois);
    expect(insumos.map((item) => item.insumoId).sort()).toEqual(['farinha', 'filme']);
  });
});
