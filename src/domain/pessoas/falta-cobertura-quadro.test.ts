import { describe, expect, it } from 'vitest';
import { FaltaCoberturaQuadro, type PessoaCobertura } from './falta-cobertura-quadro';

describe('FaltaCoberturaQuadro', () => {
  const cobertura = new FaltaCoberturaQuadro();

  it('tira desligados do quadro e aviso, afastados e admissão dos ativos', () => {
    const pessoas: PessoaCobertura[] = [
      { situacao: 'ativo', avisoAtivo: false },
      { situacao: 'ativo', avisoAtivo: true },
      { situacao: 'afastado', avisoAtivo: false },
      { situacao: 'admissao_prevista', avisoAtivo: false },
      { situacao: 'desligado', avisoAtivo: false },
    ];
    expect(cobertura.contar(pessoas)).toEqual({ quadro: 4, ativos: 1 });
  });
});
