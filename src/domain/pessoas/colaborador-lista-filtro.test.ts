import { describe, expect, it } from 'vitest';
import { ColaboradorListaFiltro } from './colaborador-lista-filtro';

describe('ColaboradorListaFiltro', () => {
  const primeiro = {
    codigo: 'VP-9001',
    nome: 'Maria da Silva',
    situacao: 'ativo' as const,
    setorNome: 'Produção',
    turnoNome: 'Manhã',
    turnoCodigo: 'T1',
    liderSetor: true,
    avisoAtivo: false,
    ultimoExame: null,
    regime: 'clt' as const,
    cnpj: null,
    razaoSocial: null,
    dataDesligamento: null,
    indicacao: 'Carlos Mendes',
  };
  const itens = [
    primeiro,
    {
      codigo: 'VP-9002',
      nome: 'João Souza',
      situacao: 'desligado' as const,
      setorNome: null,
      turnoNome: null,
      turnoCodigo: null,
      liderSetor: false,
      avisoAtivo: false,
      ultimoExame: null,
      regime: 'clt' as const,
      cnpj: null,
      razaoSocial: null,
      dataDesligamento: null,
      indicacao: null,
    },
    {
      ...primeiro,
      codigo: 'VP-9003',
      nome: 'Lia',
      liderSetor: false,
      regime: 'pj' as const,
      cnpj: '11444777000161',
      razaoSocial: 'Pão Forte LTDA',
      indicacao: null,
    },
  ];
  const filtro = new ColaboradorListaFiltro();

  it('filtra por nome e codigo sem acento/caixa; termo vazio devolve tudo', () => {
    expect(filtro.aplicar(itens, 'maria').map((i) => i.codigo)).toEqual(['VP-9001']);
    expect(filtro.aplicar(itens, 'vp-9002').map((i) => i.codigo)).toEqual(['VP-9002']);
    expect(filtro.aplicar(itens, '').length).toBe(3);
    expect(filtro.aplicar(itens, { lider: 'sim' }).map((i) => i.codigo)).toEqual(['VP-9001']);
    expect(filtro.aplicar(itens, { lider: 'nao' }).map((i) => i.codigo)).toEqual(['VP-9002', 'VP-9003']);
    expect(filtro.aplicar(itens, { lider: '' }).length).toBe(3);
  });

  it('filtra por regime e busca razão social e CNPJ', () => {
    expect(filtro.aplicar(itens, { regime: 'pj' }).map((i) => i.codigo)).toEqual(['VP-9003']);
    expect(filtro.aplicar(itens, { regime: '' }).length).toBe(3);
    expect(filtro.aplicar(itens, 'pao forte').map((i) => i.codigo)).toEqual(['VP-9003']);
    expect(filtro.aplicar(itens, '11.444.777/0001-61').map((i) => i.codigo)).toEqual(['VP-9003']);
  });

  it('filtra por indicação', () => {
    expect(filtro.aplicar(itens, 'carlos').map((i) => i.codigo)).toEqual(['VP-9001']);
    expect(filtro.aplicar(itens, 'mendes').map((i) => i.codigo)).toEqual(['VP-9001']);
  });

  it('não confunde dígito de código com CNPJ', () => {
    expect(filtro.aplicar(itens, 'VP-1').map((i) => i.codigo)).toEqual([]);
    expect(filtro.aplicar(itens, 'VP-9001').map((i) => i.codigo)).toEqual(['VP-9001']);
  });

  it('combina regime com os demais filtros', () => {
    expect(filtro.aplicar(itens, { regime: 'pj', situacao: 'desligado' })).toEqual([]);
  });
});
