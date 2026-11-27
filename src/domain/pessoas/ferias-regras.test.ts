import { describe, expect, it } from 'vitest';
import { FeriasRegras, type ContextoFerias } from './ferias-regras';

const hoje = '2026-11-26';

function contexto(parcial: Partial<ContextoFerias> = {}): ContextoFerias {
  return {
    situacao: 'ativo',
    avisoAtivo: false,
    regime: 'clt',
    dataDesligamento: null,
    outrosPeriodos: [],
    faltasAtivas: [],
    ...parcial,
  };
}

describe('FeriasRegras', () => {
  const regras = new FeriasRegras();

  it('lança período com início hoje ou no futuro', () => {
    expect(regras.lancar('2026-12-01', '2026-12-31', hoje, contexto())).toEqual({
      inicio: '2026-12-01',
      volta: '2026-12-31',
    });
  });

  it('recusa datas, pessoa, cruzamento e falta nessa ordem', () => {
    expect(() => regras.lancar('', '2026-12-31', hoje, contexto())).toThrow('Informe o início e a volta.');
    expect(() => regras.lancar('2026-12-31', '2026-12-01', hoje, contexto())).toThrow(
      'A volta precisa ser depois do início.',
    );
    expect(() => regras.lancar('2026-11-01', '2026-12-01', hoje, contexto())).toThrow(
      'O início não pode ser anterior a hoje.',
    );
    expect(() => regras.lancar('2026-12-01', '2026-12-31', hoje, contexto({ situacao: 'afastado' }))).toThrow(
      'Só um colaborador ativo pode entrar de férias.',
    );
    expect(() => regras.lancar('2026-12-01', '2026-12-31', hoje, contexto({ avisoAtivo: true }))).toThrow(
      'Cancele o aviso antes de lançar férias.',
    );
    expect(() =>
      regras.lancar(
        '2026-12-01',
        '2026-12-31',
        hoje,
        contexto({ regime: 'pj', dataDesligamento: '2026-12-20', avisoAtivo: true }),
      ),
    ).toThrow('Cancele o aviso antes de lançar férias.');
    expect(() =>
      regras.lancar('2026-12-01', '2026-12-31', hoje, contexto({ regime: 'pj', dataDesligamento: '2026-12-20' })),
    ).toThrow('Cancele a saída prevista antes de lançar férias.');
    expect(() =>
      regras.lancar(
        '2026-12-01',
        '2026-12-31',
        hoje,
        contexto({ outrosPeriodos: [{ inicio: '2026-12-10', volta: '2026-12-20' }] }),
      ),
    ).toThrow('Já existe férias nesse período.');
    expect(() => regras.lancar('2026-12-01', '2026-12-31', hoje, contexto({ faltasAtivas: ['2026-12-02'] }))).toThrow(
      'Cancele a falta de 02/12 antes de lançar as férias.',
    );
  });

  it('trava o início em gozo e encerra quando a volta é hoje', () => {
    const atual = { inicio: '2026-12-01', volta: '2026-12-31' };
    expect(() => regras.alterar(atual, '2026-12-05', '2026-12-20', '2026-12-10', contexto())).toThrow(
      'O início das férias em gozo não pode mudar.',
    );
    expect(regras.alterar(atual, '2026-12-01', '2026-12-10', '2026-12-10', contexto())).toEqual({
      inicio: '2026-12-01',
      volta: '2026-12-10',
    });
  });

  it('cancela período aberto e recusa o que já encerrou', () => {
    expect(regras.cancelar({ inicio: '2026-12-01', volta: '2026-12-31' }, '2026-12-10')).toEqual({ cancela: true });
    expect(() => regras.cancelar(null, hoje)).toThrow('Não há férias em aberto.');
    expect(() => regras.cancelar({ inicio: '2026-12-01', volta: '2026-12-31' }, '2026-12-31')).toThrow(
      'Não há férias em aberto.',
    );
  });
});
