import { describe, expect, it } from 'vitest';
import { FaltaAnexoIndicacao } from './falta-anexo-indicacao';

describe('FaltaAnexoIndicacao', () => {
  const indicacao = new FaltaAnexoIndicacao();

  it('marca a pessoa quando alguma falta ativa tem anexo', () => {
    expect(
      indicacao.existeParaPessoa(
        [
          { codigo: 'VP-1', temAnexo: false, cancelada: false },
          { codigo: 'VP-1', temAnexo: true, cancelada: false },
        ],
        'VP-1',
      ),
    ).toBe(true);
  });

  it('ignora anexo de falta cancelada e de outra pessoa', () => {
    expect(
      indicacao.existeParaPessoa(
        [
          { codigo: 'VP-1', temAnexo: true, cancelada: true },
          { codigo: 'VP-2', temAnexo: true, cancelada: false },
        ],
        'VP-1',
      ),
    ).toBe(false);
  });
});
