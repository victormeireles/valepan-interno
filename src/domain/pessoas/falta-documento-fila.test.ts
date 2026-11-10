import { describe, expect, it } from 'vitest';
import { FaltaDocumentoFila, type FaltaDocumentoEntrada } from './falta-documento-fila';

const HOJE = '2026-11-09';
const fila = new FaltaDocumentoFila();

function falta(parcial: Partial<FaltaDocumentoEntrada> & Pick<FaltaDocumentoEntrada, 'id' | 'data'>): FaltaDocumentoEntrada {
  return {
    codigo: 'VP-1',
    nome: 'Ana',
    classificacao: 'injustificada',
    cancelada: false,
    temAnexo: false,
    situacao: 'ativo',
    ...parcial,
  };
}

describe('FaltaDocumentoFila', () => {
  it('junta sexta e sábado e pede o documento na segunda', () => {
    const periodos = fila.montar([
      falta({ id: 'sexta', data: '2026-11-06' }),
      falta({ id: 'sabado', data: '2026-11-07' }),
    ], HOJE);

    expect(periodos).toEqual([
      periodo({ inicio: '2026-11-06', fim: '2026-11-07', dias: 2, situacao: 'enviar_hoje', faltaIds: ['sexta', 'sabado'] }),
    ]);
  });

  it('separa sexta e segunda quando o sábado não tem falta', () => {
    const periodos = fila.montar([
      falta({ id: 'sexta', data: '2026-11-06' }),
      falta({ id: 'segunda', data: '2026-11-09' }),
    ], HOJE);

    expect(periodos.map((item) => [item.inicio, item.situacao, item.diasUteis])).toEqual([
      ['2026-11-06', 'atrasado', 2],
      ['2026-11-09', 'ainda_ausente', 0],
    ]);
  });

  it('junta sábado e segunda porque domingo não separa', () => {
    const periodos = fila.montar([
      falta({ id: 'sabado', data: '2026-11-07' }),
      falta({ id: 'segunda', data: '2026-11-09' }),
    ], HOJE);

    expect(periodos).toEqual([
      periodo({ inicio: '2026-11-07', fim: '2026-11-09', dias: 2, situacao: 'ainda_ausente', faltaIds: ['sabado', 'segunda'] }),
    ]);
  });

  it('trata falta justificada no meio como dia sem trabalho', () => {
    const periodos = fila.montar([
      falta({ id: 'sexta', data: '2026-11-06' }),
      falta({ id: 'sabado', data: '2026-11-07', classificacao: 'justificada' }),
      falta({ id: 'segunda', data: '2026-11-09' }),
    ], HOJE);

    expect(periodos).toEqual([
      periodo({ inicio: '2026-11-06', fim: '2026-11-09', dias: 2, situacao: 'ainda_ausente', faltaIds: ['sexta', 'segunda'] }),
    ]);
  });

  it('não cobra enquanto o retorno ainda não chegou', () => {
    const periodos = fila.montar([falta({ id: 'sabado', data: '2026-11-07' })], '2026-11-08');
    expect(periodos[0]?.situacao).toBe('ainda_ausente');
  });

  it('marca atraso pelos dias úteis desde o dia de enviar', () => {
    const periodos = fila.montar([falta({ id: 'quinta', data: '2026-11-05' })], HOJE);
    expect(periodos[0]).toMatchObject({ situacao: 'atrasado', diasUteis: 3 });
  });

  it('tira o período da fila quando qualquer dia tem foto', () => {
    const periodos = fila.montar([
      falta({ id: 'sexta', data: '2026-11-06', temAnexo: true }),
      falta({ id: 'sabado', data: '2026-11-07' }),
    ], HOJE);
    expect(periodos).toEqual([]);
  });

  it('mantém o período novo sem foto mesmo com documento antigo', () => {
    const periodos = fila.montar([
      falta({ id: 'antiga', data: '2026-10-02', temAnexo: true }),
      falta({ id: 'nova', data: '2026-11-06' }),
    ], HOJE);
    expect(periodos.map((item) => item.faltaIds)).toEqual([['nova']]);
  });

  it('ignora falta cancelada, justificada isolada e de outra classificação', () => {
    const periodos = fila.montar([
      falta({ id: 'cancelada', data: '2026-11-06', cancelada: true }),
      falta({ id: 'justificada', data: '2026-11-05', classificacao: 'justificada' }),
      falta({ id: 'suspensao', data: '2026-11-04', classificacao: 'suspensao' }),
    ], HOJE);
    expect(periodos).toEqual([]);
  });

  it('não cobra documento de colaborador desligado', () => {
    const periodos = fila.montar([
      falta({ id: 'desligado', data: '2026-11-05', situacao: 'desligado' }),
      falta({ id: 'afastado', data: '2026-11-06', codigo: 'VP-2', nome: 'Bia', situacao: 'afastado' }),
    ], HOJE);
    expect(periodos).toEqual([]);
  });

  it('ordena atrasado, enviar hoje e quando voltar', () => {
    const periodos = fila.montar([
      falta({ id: 'hoje', data: '2026-11-09', codigo: 'VP-2', nome: 'Bia' }),
      falta({ id: 'enviar', data: '2026-11-07', codigo: 'VP-3', nome: 'Caio' }),
      falta({ id: 'atraso', data: '2026-11-05', codigo: 'VP-1', nome: 'Ana' }),
    ], HOJE);
    expect(periodos.map((item) => item.situacao)).toEqual(['atrasado', 'enviar_hoje', 'ainda_ausente']);
  });

  it('escolhe o selo mais urgente da pessoa', () => {
    const periodos = fila.montar([
      falta({ id: 'sexta', data: '2026-11-06' }),
      falta({ id: 'segunda', data: '2026-11-09' }),
    ], HOJE);
    expect(fila.selo(periodos, 'VP-1')).toBe('atrasado');
    expect(fila.selo(periodos, 'VP-9')).toBeNull();
  });
});

function periodo(parcial: {
  inicio: string;
  fim: string;
  dias: number;
  situacao: 'atrasado' | 'enviar_hoje' | 'ainda_ausente';
  faltaIds: string[];
  diasUteis?: number;
}) {
  return {
    codigo: 'VP-1',
    nome: 'Ana',
    diasUteis: 0,
    ...parcial,
  };
}
