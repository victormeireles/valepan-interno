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
    dataAdmissao: '2026-11-01',
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
      dataAdmissao: '2026-11-01',
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

  it('filtra experiência a vencer em 7 dias e ignora desligado', () => {
    expect(
      filtro.aplicar(itens, { vencimento: 'experiencia', hoje: '2026-11-24' }).map((item) => item.codigo),
    ).toEqual(['VP-9001', 'VP-9003']);
    expect(filtro.aplicar(itens, { vencimento: 'experiencia', hoje: '2026-11-24', regime: 'pj' }).map((item) => item.codigo)).toEqual([
      'VP-9003',
    ]);
  });

  it('filtra exame que vence em até 14 dias, depois da experiência', () => {
    const base = { ...primeiro, liderSetor: false, dataAdmissao: '2026-01-01', indicacao: null };
    const comExame = [
      { ...base, codigo: 'VP-9101', nome: 'Perto', ultimoExame: '2025-12-01' },
      { ...base, codigo: 'VP-9102', nome: 'Hoje', ultimoExame: '2025-11-24' },
      { ...base, codigo: 'VP-9103', nome: 'Limite', ultimoExame: '2025-12-08' },
      { ...base, codigo: 'VP-9104', nome: 'Longe', ultimoExame: '2025-12-09' },
      { ...base, codigo: 'VP-9105', nome: 'Vencido', ultimoExame: '2025-10-01' },
      { ...base, codigo: 'VP-9106', nome: 'Ainda na experiência', dataAdmissao: '2026-11-01', ultimoExame: '2025-12-01' },
      { ...primeiro, codigo: 'VP-9107', nome: 'PJ com exame', regime: 'pj' as const, dataAdmissao: '2026-01-01', ultimoExame: '2025-12-10' },
    ];
    expect(filtro.aplicar(comExame, { vencimento: 'exame', hoje: '2026-11-24' }).map((item) => item.codigo)).toEqual([
      'VP-9101',
      'VP-9102',
      'VP-9103',
    ]);
  });

  it('combina regime com os demais filtros', () => {
    expect(filtro.aplicar(itens, { regime: 'pj', situacao: 'desligado' })).toEqual([]);
  });
});
