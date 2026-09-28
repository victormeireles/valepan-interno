import { describe, expect, it } from 'vitest';
import { TurnoRemocao } from './turno-remocao';

describe('TurnoRemocao', () => {
  const remocao = new TurnoRemocao();

  it('não conta apoio como vaga ocupada', () => {
    expect(remocao.ocupadas(0, 0)).toBe(0);
    expect(remocao.ocupadas(2, 1)).toBe(3);
  });

  it('lista só o apoio daquele turno', () => {
    const apoio = [
      { nome: 'Nilton Rodrigues Campos', turnoCodigo: 'AP-GPR' },
      { nome: 'Geovani Thiago de Souza', turnoCodigo: 'AP-GPR13' },
    ];
    expect(remocao.nomesApoio(apoio, 'AP-GPR')).toEqual(['Nilton Rodrigues Campos']);
  });

  it('avisa quem sai do quadro ao remover o turno', () => {
    expect(remocao.avisoApoio([])).toBeNull();
    expect(remocao.avisoApoio(['Nilton Rodrigues Campos'])).toBe(
      'Nilton Rodrigues Campos está como apoio neste turno e sai do quadro.',
    );
    expect(remocao.avisoApoio(['Ana', 'Lia'])).toBe('Ana e Lia estão como apoio neste turno e saem do quadro.');
  });
});
