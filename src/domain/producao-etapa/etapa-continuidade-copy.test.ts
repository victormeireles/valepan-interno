import { describe, expect, it } from 'vitest';
import { EtapaContinuidadeCopy } from './etapa-continuidade-copy';

function textosFinalizar(naoProduzido = 183, unidade = 'LT'): string {
  return [
    EtapaContinuidadeCopy.tituloFinalizarAbaixo(),
    EtapaContinuidadeCopy.mensagemFinalizarAbaixo(),
    EtapaContinuidadeCopy.confirmarFinalizarAbaixo(naoProduzido, unidade),
    EtapaContinuidadeCopy.labelNaoProduzido(),
  ].join(' ');
}

describe('EtapaContinuidadeCopy', () => {
  it('explica ordem incompleta sem falar em perda', () => {
    const textos = textosFinalizar().toLowerCase();

    expect(textos).not.toMatch(/perda|perdido/);
    expect(EtapaContinuidadeCopy.tituloFinalizarAbaixo()).toBe(
      'Quantidade abaixo da ordem',
    );
    expect(EtapaContinuidadeCopy.mensagemFinalizarAbaixo()).toContain(
      'não será produzido por completo',
    );
  });

  it('formata o confirm com quantidade pt-BR e unidade', () => {
    expect(EtapaContinuidadeCopy.confirmarFinalizarAbaixo(183, 'LT')).toBe(
      'Sim, finalizar com 183 LT a menos',
    );
    expect(EtapaContinuidadeCopy.confirmarFinalizarAbaixo(1800, 'LT')).toBe(
      'Sim, finalizar com 1.800 LT a menos',
    );
  });
});
