import { describe, expect, it } from 'vitest';
import { QuadroContagem, QuadroMontagem, type PessoaQuadro, type VagaAprovada } from './quadro-montagem';

function pessoa(over: Partial<PessoaQuadro> & Pick<PessoaQuadro, 'codigo'>): PessoaQuadro {
  return {
    situacao: 'ativo',
    setorCodigo: 'PRO',
    turnoCodigo: 'PRO-M',
    noQuadro: true,
    ...over,
  };
}

describe('QuadroMontagem', () => {
  const montagem = new QuadroMontagem();
  const contagem = new QuadroContagem();

  it('reserva uma vaga e deixa apoio fora da conta', () => {
    const vagas: VagaAprovada[] = [{ setorCodigo: 'PRO', turnoCodigo: 'PRO-M', quantidade: 3 }];
    const pessoas = [
      pessoa({ codigo: 'VP-9002', situacao: 'admissao_prevista' }),
      pessoa({ codigo: 'VP-9001' }),
      pessoa({
        codigo: 'VP-9003',
        setorCodigo: 'OPS',
        turnoCodigo: 'AP-OPS',
        noQuadro: false,
      }),
    ];
    const resultado = montagem.montar(vagas, pessoas);
    expect(resultado.erros).toEqual([]);
    expect(resultado.posicoes.map((p) => p.codigo)).toEqual(['PRO-M-01', 'PRO-M-02', 'PRO-M-03']);
    expect(resultado.alocacoes.find((a) => a.pessoaCodigo === 'VP-9002')?.papel).toBe('reserva');
    expect(resultado.alocacoes.find((a) => a.pessoaCodigo === 'VP-9003')?.posicaoCodigo).toBeNull();
    expect(contagem.contar(resultado)).toEqual({
      aprovado: 3,
      contratados: 1,
      reservas: 1,
      livres: 1,
    });
  });

  it('não inventa vaga quando faltam posições', () => {
    const resultado = montagem.montar(
      [{ setorCodigo: 'PRO', turnoCodigo: 'PRO-M', quantidade: 1 }],
      [pessoa({ codigo: 'VP-9001' }), pessoa({ codigo: 'VP-9002' })],
    );
    expect(resultado.erros).toEqual([{ codigo: 'VP-9002', motivo: 'sem vaga livre' }]);
    expect(resultado.alocacoes).toHaveLength(1);
  });

  it('fecha o quadro inicial em 93, 64, 1 e 28', () => {
    const vagas: VagaAprovada[] = [{ setorCodigo: 'PRO', turnoCodigo: 'PRO-M', quantidade: 93 }];
    const pessoas: PessoaQuadro[] = [
      ...Array.from({ length: 64 }, (_, i) => pessoa({ codigo: `VP-${String(i + 1).padStart(4, '0')}` })),
      pessoa({ codigo: 'VP-0099', situacao: 'admissao_prevista' }),
      ...Array.from({ length: 11 }, (_, i) =>
        pessoa({
          codigo: `VP-8${String(i).padStart(3, '0')}`,
          setorCodigo: 'OPS',
          turnoCodigo: 'AP-OPS',
          noQuadro: false,
        }),
      ),
    ];
    const resultado = montagem.montar(vagas, pessoas);
    expect(resultado.erros).toEqual([]);
    expect(contagem.contar(resultado)).toEqual({
      aprovado: 93,
      contratados: 64,
      reservas: 1,
      livres: 28,
    });
    expect(resultado.alocacoes.filter((a) => a.papel === 'apoio')).toHaveLength(11);
  });
});
