import { describe, expect, it } from 'vitest';
import { InsumoCompraJanela } from './insumo-compra-janela';

describe('InsumoCompraJanela', () => {
  const janela = new InsumoCompraJanela();

  it('qualquer: sempre na janela e W=0', () => {
    expect(janela.estaNaJanela('qualquer', null, 3)).toBe(true);
    expect(janela.diasAteProximoPermitido('qualquer', null, 3)).toBe(0);
  });

  it('segunda (1): terça → W=6; segunda → W=0', () => {
    expect(janela.estaNaJanela('dias_semana', [1], 1)).toBe(true);
    expect(janela.diasAteProximoPermitido('dias_semana', [1], 1)).toBe(0);
    expect(janela.estaNaJanela('dias_semana', [1], 2)).toBe(false);
    expect(janela.diasAteProximoPermitido('dias_semana', [1], 2)).toBe(6);
  });

  it('seg–qua (1,2,3): quinta → W=4', () => {
    expect(janela.diasAteProximoPermitido('dias_semana', [1, 2, 3], 4)).toBe(4);
  });
});
