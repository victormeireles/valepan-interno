import { describe, expect, it } from 'vitest';
import { OrdemFinalizacao, type PecaFinalizacao } from './ordem-finalizacao';

const ABERTA = '2026-11-09T10:00:00-03:00';
const INICIO = '2026-11-09T10:30:00-03:00';
const FIM = '2026-11-09T11:00:00-03:00';
const AGORA = '2026-11-09T11:00:00-03:00';

type PecaConsulta = {
  id: string;
  ativo: boolean;
  custoMedioCentavos: number | null;
  saldoMilesimos: number;
  codigo?: string;
};

function peca(parcial: Partial<PecaConsulta> = {}): PecaConsulta {
  return {
    id: 'peca-1',
    ativo: true,
    custoMedioCentavos: 100,
    saldoMilesimos: 10000,
    codigo: 'ROL-1',
    ...parcial,
  };
}

function linha(parcial: Partial<PecaFinalizacao> = {}): PecaFinalizacao {
  return { pecaId: 'peca-1', quantidadeMilesimos: 1000, ...parcial };
}

describe('OrdemFinalizacao', () => {
  const finalizacao = new OrdemFinalizacao();

  it('recusa início antes da abertura, inclusive quando o ISO muda de fuso', () => {
    expect(finalizacao.validarHorarios(ABERTA, '2026-11-09T09:59:00-03:00', FIM, AGORA)).toEqual({
      ok: false,
      mensagem: 'O início não pode ser antes da abertura.',
    });
    expect(
      finalizacao.validarHorarios(
        '2026-11-09T13:00:00-03:00',
        '2026-11-09T15:00:00Z',
        '2026-11-09T16:30:00Z',
        '2026-11-09T16:30:00Z',
      ),
    ).toEqual({
      ok: false,
      mensagem: 'O início não pode ser antes da abertura.',
    });
  });

  it('recusa fim igual ou anterior ao início, comparando o instante', () => {
    expect(finalizacao.validarHorarios(ABERTA, INICIO, INICIO, AGORA)).toEqual({
      ok: false,
      mensagem: 'O fim deve ser depois do início.',
    });
    expect(
      finalizacao.validarHorarios(
        '2026-11-09T10:00:00Z',
        '2026-11-09T16:00:00.000Z',
        '2026-11-09T13:00:00-03:00',
        '2026-11-09T18:00:00Z',
      ),
    ).toEqual({
      ok: false,
      mensagem: 'O fim deve ser depois do início.',
    });
  });

  it('recusa fim depois de agora', () => {
    expect(
      finalizacao.validarHorarios(ABERTA, INICIO, '2026-11-09T11:00:01-03:00', AGORA),
    ).toEqual({
      ok: false,
      mensagem: 'O fim não pode ficar no futuro.',
    });
  });

  it('aceita início na abertura e fim agora, mesmo com offset diferente', () => {
    expect(finalizacao.validarHorarios(ABERTA, ABERTA, FIM, AGORA)).toEqual({ ok: true });
    expect(
      finalizacao.validarHorarios(
        '2026-11-09T16:00:00Z',
        '2026-11-09T13:30:00-03:00',
        '2026-11-09T14:00:00-03:00',
        '2026-11-09T17:00:00Z',
      ),
    ).toEqual({ ok: true });
  });

  it('recusa serviços vazios ou só com espaço', () => {
    expect(finalizacao.validarServicos('')).toEqual({
      ok: false,
      mensagem: 'Informe os serviços executados.',
    });
    expect(finalizacao.validarServicos('   ')).toEqual({
      ok: false,
      mensagem: 'Informe os serviços executados.',
    });
  });

  it('devolve os serviços aparados', () => {
    expect(finalizacao.validarServicos('  Troca da correia  ')).toEqual({
      ok: true,
      servicos: 'Troca da correia',
    });
  });

  it('soma a mesma peça antes de custear, com empate para cima no total', () => {
    const resultado = finalizacao.consolidarPecas(
      [linha({ quantidadeMilesimos: 500 }), linha({ quantidadeMilesimos: 500 })],
      [peca({ custoMedioCentavos: 1, saldoMilesimos: 1000 })],
    );

    expect(resultado).toEqual({
      ok: true,
      linhas: [
        {
          pecaId: 'peca-1',
          quantidadeMilesimos: 1000,
          custoUnitarioCentavos: 1,
          custoTotalCentavos: 1,
        },
      ],
      custoPecasCentavos: 1,
      faltando: [],
    });
  });

  it('arredonda 1,5 milésimo-centavo para 2 e mantém a fração abaixo do empate', () => {
    const meio = finalizacao.consolidarPecas(
      [linha({ quantidadeMilesimos: 1500 })],
      [peca({ custoMedioCentavos: 1 })],
    );
    const abaixo = finalizacao.consolidarPecas(
      [linha({ quantidadeMilesimos: 1400 })],
      [peca({ custoMedioCentavos: 1 })],
    );

    expect(meio).toMatchObject({
      ok: true,
      linhas: [{ custoUnitarioCentavos: 1, custoTotalCentavos: 2 }],
      custoPecasCentavos: 2,
    });
    expect(abaixo).toMatchObject({
      ok: true,
      linhas: [{ custoTotalCentavos: 1 }],
      custoPecasCentavos: 1,
    });
  });

  it('usa custo unitário zero quando o custo médio é nulo', () => {
    expect(
      finalizacao.consolidarPecas(
        [linha({ quantidadeMilesimos: 2500 })],
        [peca({ custoMedioCentavos: null, saldoMilesimos: 5000 })],
      ),
    ).toEqual({
      ok: true,
      linhas: [
        {
          pecaId: 'peca-1',
          quantidadeMilesimos: 2500,
          custoUnitarioCentavos: 0,
          custoTotalCentavos: 0,
        },
      ],
      custoPecasCentavos: 0,
      faltando: [],
    });
  });

  it('recusa quantidade zero, negativa ou com fração de milésimo', () => {
    const mensagem = 'Informe uma quantidade maior que zero, com até 3 casas.';
    for (const quantidadeMilesimos of [0, -1, 1.5]) {
      expect(finalizacao.consolidarPecas([linha({ quantidadeMilesimos })], [peca()])).toEqual({
        ok: false,
        mensagem,
      });
    }
  });

  it('recusa peça inativa', () => {
    expect(
      finalizacao.consolidarPecas([linha()], [peca({ ativo: false })]),
    ).toEqual({ ok: false, mensagem: 'Peça inativa.' });
  });

  it('recusa peça ausente', () => {
    expect(finalizacao.consolidarPecas([linha({ pecaId: 'peca-9' })], [peca()])).toEqual({
      ok: false,
      mensagem: 'Peça não encontrada.',
    });
  });

  it('lista o código, ou o id, das peças que ficam com saldo negativo depois da soma', () => {
    const resultado = finalizacao.consolidarPecas(
      [
        linha({ pecaId: 'peca-1', quantidadeMilesimos: 600 }),
        linha({ pecaId: 'peca-2', quantidadeMilesimos: 100 }),
        linha({ pecaId: 'peca-1', quantidadeMilesimos: 600 }),
        linha({ pecaId: 'peca-3', quantidadeMilesimos: 1000 }),
        linha({ pecaId: 'peca-4', quantidadeMilesimos: 500 }),
      ],
      [
        peca({ id: 'peca-1', codigo: 'ROL-1', saldoMilesimos: 1000, custoMedioCentavos: 10 }),
        peca({ id: 'peca-2', codigo: 'PAR-2', saldoMilesimos: 100, custoMedioCentavos: 20 }),
        peca({ id: 'peca-3', codigo: undefined, saldoMilesimos: 0, custoMedioCentavos: 5 }),
        peca({ id: 'peca-4', codigo: 'OK-4', saldoMilesimos: 500, custoMedioCentavos: 8 }),
      ],
    );

    expect(resultado).toEqual({
      ok: true,
      linhas: [
        {
          pecaId: 'peca-1',
          quantidadeMilesimos: 1200,
          custoUnitarioCentavos: 10,
          custoTotalCentavos: 12,
        },
        {
          pecaId: 'peca-2',
          quantidadeMilesimos: 100,
          custoUnitarioCentavos: 20,
          custoTotalCentavos: 2,
        },
        {
          pecaId: 'peca-3',
          quantidadeMilesimos: 1000,
          custoUnitarioCentavos: 5,
          custoTotalCentavos: 5,
        },
        {
          pecaId: 'peca-4',
          quantidadeMilesimos: 500,
          custoUnitarioCentavos: 8,
          custoTotalCentavos: 4,
        },
      ],
      custoPecasCentavos: 23,
      faltando: ['ROL-1', 'peca-3'],
    });
  });

  it('aceita finalização sem peças', () => {
    expect(finalizacao.consolidarPecas([], [])).toEqual({
      ok: true,
      linhas: [],
      custoPecasCentavos: 0,
      faltando: [],
    });
  });
});
