import { describe, expect, it } from 'vitest';
import { FolhaAprovados } from './folha-aprovados';
import type { FolhaPessoa } from './folha-resumo';
import { FolhaResumo } from './folha-resumo';

function pessoa(parcial: Partial<FolhaPessoa> & Pick<FolhaPessoa, 'nome' | 'situacao'>): FolhaPessoa {
  return {
    setorNome: 'Produção',
    regime: 'clt',
    nascimento: '1990-01-01',
    pacote: {
      salarioCentavos: 100_000,
      valeTransporteCentavos: 20_000,
      valeAlimentacaoCentavos: 30_000,
      planoSaude: false,
    },
    ...parcial,
  };
}

describe('FolhaAprovados', () => {
  it('conta vaga ativa por setor e mantém setor do catálogo sem vaga', () => {
    const setores = new FolhaAprovados().montar(
      [
        { nome: 'Produção', ordem: 1 },
        { nome: 'Expedição', ordem: 2 },
      ],
      ['Produção', 'Produção', 'Comercial'],
    );
    expect(setores).toEqual([
      { nome: 'Produção', ordem: 1, aprovado: 2 },
      { nome: 'Expedição', ordem: 2, aprovado: 0 },
      { nome: 'Comercial', ordem: 9_000, aprovado: 1 },
    ]);
  });
});

describe('FolhaResumo', () => {
  const resumo = new FolhaResumo();
  const setores = [
    { nome: 'Expedição', ordem: 2, aprovado: 4 },
    { nome: 'Produção', ordem: 1, aprovado: 3 },
  ];

  it('soma ativos e a entrar e deixa fora do posto de fora', () => {
    const vista = resumo.montar(
      [
        pessoa({ nome: 'Ana', situacao: 'ativo' }),
        pessoa({ nome: 'Bia', situacao: 'afastado', pacote: { salarioCentavos: 50_000, valeTransporteCentavos: 0, valeAlimentacaoCentavos: 0, planoSaude: true } }),
        pessoa({ nome: 'Caio', situacao: 'admissao_prevista' }),
      ],
      setores,
    );
    expect(vista.atual.pessoas).toBe(2);
    expect(vista.atual.totalCentavos).toBe(1_140_000);
    expect(vista.atual.planoSaude).toBe(0);
    expect(vista.contratados.pessoas).toBe(1);
    expect(vista.contratados.totalCentavos).toBe(570_000);
    expect(vista.aEntrar.pessoas).toBe(1);
    expect(vista.aEntrar.totalCentavos).toBe(570_000);
    expect(vista.foraDoPosto).toBe(1);
    expect(vista.atual.salarioCentavos).toBe(200_000);
    expect(vista.atual.valeTransporteCentavos).toBe(20_000 * 22 * 2);
    expect(vista.atual.valeAlimentacaoCentavos).toBe(60_000);
    expect(vista.lacunas).toEqual([]);
  });

  it('filtra só ativos ou só a entrar sem misturar o total', () => {
    const pessoas = [
      pessoa({ nome: 'Ana', situacao: 'ativo' }),
      pessoa({ nome: 'Caio', situacao: 'admissao_prevista' }),
    ];
    const ativos = resumo.montar(pessoas, setores, '', 'ativos');
    const aEntrar = resumo.montar(pessoas, setores, '', 'a_entrar');
    expect(ativos.atual.totalCentavos).toBe(570_000);
    expect(ativos.atual.pessoas).toBe(1);
    expect(ativos.aEntrar.pessoas).toBe(1);
    expect(aEntrar.atual.totalCentavos).toBe(570_000);
    expect(aEntrar.atual.pessoas).toBe(1);
    expect(aEntrar.contratados.pessoas).toBe(1);
    expect(ativos.setores[0]?.atual.pessoas).toBe(1);
  });

  it('soma o plano de saúde da faixa etária no total', () => {
    const faixas = [{ id: 'a', idadeMin: 0, idadeMax: 18, valorCentavos: 21675, ordem: 1 }];
    const vista = resumo.montar(
      [pessoa({ nome: 'Ana', situacao: 'ativo', nascimento: '2010-01-01', pacote: { salarioCentavos: 100_000, valeTransporteCentavos: 0, valeAlimentacaoCentavos: 0, planoSaude: true } })],
      setores,
      '',
      '',
      { faixas, hoje: '2026-11-05' },
    );
    expect(vista.atual.planoSaude).toBe(1);
    expect(vista.atual.planoSaudeCentavos).toBe(21675);
    expect(vista.atual.totalCentavos).toBe(121_675);
    expect(vista.planosSemFaixa).toEqual([]);
  });

  it('marca a lacuna quando falta nascimento ou faixa', () => {
    const faixas = [{ id: 'a', idadeMin: 0, idadeMax: 18, valorCentavos: 21675, ordem: 1 }];
    const pacote = { salarioCentavos: 0, valeTransporteCentavos: 0, valeAlimentacaoCentavos: 0, planoSaude: true };
    const vista = resumo.montar(
      [
        pessoa({ nome: 'Ana', situacao: 'ativo', nascimento: null, pacote }),
        pessoa({ nome: 'Caio', situacao: 'admissao_prevista', nascimento: '1990-01-01', pacote }),
      ],
      setores,
      '',
      '',
      { faixas, hoje: '2026-11-05' },
    );
    expect(vista.atual.planoSaudeCentavos).toBe(0);
    expect(vista.atual.planoSaudeSemFaixa).toBe(2);
    expect(vista.planosSemFaixa).toEqual([
      { nome: 'Ana', setorNome: 'Produção', motivo: 'sem_nascimento' },
      { nome: 'Caio', setorNome: 'Produção', motivo: 'sem_faixa' },
    ]);
  });

  it('conta pessoa sem pacote e não soma valor', () => {
    const vista = resumo.montar([pessoa({ nome: 'Ana', situacao: 'ativo', pacote: null })], setores);
    expect(vista.contratados).toMatchObject({ pessoas: 1, comPacote: 0, totalCentavos: 0 });
    expect(vista.lacunas).toEqual([{ nome: 'Ana', setorNome: 'Produção', situacao: 'ativo' }]);
  });

  it('mostra vaga aprovada sem pessoa e esconde setor vazio', () => {
    const vista = resumo.montar([], setores);
    expect(vista.aprovado).toBe(7);
    expect(vista.setores.map((setor) => setor.nome)).toEqual(['Produção', 'Expedição']);
    expect(vista.setores[0]?.contratados.totalCentavos).toBe(0);
  });

  it('manda quem está sem setor para o fim', () => {
    const vista = resumo.montar([pessoa({ nome: 'Ana', situacao: 'ativo', setorNome: null })], setores);
    expect(vista.setores.map((setor) => setor.nome)).toEqual(['Produção', 'Expedição', 'Sem setor']);
  });

  it('filtra CLT sem mudar a contagem de vagas aprovadas', () => {
    const vista = resumo.montar(
      [
        pessoa({ nome: 'Ana', situacao: 'ativo', regime: 'clt' }),
        pessoa({ nome: 'Bia', situacao: 'ativo', regime: 'pj', setorNome: 'Expedição' }),
      ],
      setores,
      'clt',
    );
    expect(vista.contratados.pessoas).toBe(1);
    expect(vista.aprovado).toBe(7);
    expect(vista.setores.find((setor) => setor.nome === 'Expedição')?.contratados.pessoas).toBe(0);
  });
});
