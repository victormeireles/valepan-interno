import { describe, expect, it } from 'vitest';
import {
  calcularProgressoEmbalagemPedido,
  contarFotosEmbalagem,
} from '@/domain/embalagem/embalagem-lote-modal';
import type { ProducaoData } from '@/domain/types';

const meta = { caixas: 225, pacotes: 0, unidades: 0, kg: 0 };
const saldo = { caixas: 45, pacotes: 0, unidades: 0, kg: 0 };

describe('calcularProgressoEmbalagemPedido', () => {
  it('calcula produzido e percentual na dimensão principal (cx/pct)', () => {
    expect(calcularProgressoEmbalagemPedido(meta, saldo)).toEqual({
      dimensao: 'caixas',
      label: 'cx',
      meta: 225,
      produzido: 180,
      restante: 45,
      percentual: 80,
    });
  });

  it('usa unidades quando meta é só un', () => {
    expect(
      calcularProgressoEmbalagemPedido(
        { caixas: 0, pacotes: 0, unidades: 500, kg: 0 },
        { caixas: 0, pacotes: 0, unidades: 100, kg: 0 },
      ),
    ).toEqual({
      dimensao: 'unidades',
      label: 'un',
      meta: 500,
      produzido: 400,
      restante: 100,
      percentual: 80,
    });
  });
});

describe('contarFotosEmbalagem', () => {
  const empty: ProducaoData = { caixas: 0, pacotes: 0, unidades: 0, kg: 0 };
  const files = { pacote: null, etiqueta: null, pallet: null };

  it('conta 3 fotos obrigatórias para cliente normal', () => {
    expect(
      contarFotosEmbalagem(
        { ...empty, pacoteFotoUrl: 'a', etiquetaFotoUrl: 'b' },
        files,
        'Cliente X',
      ),
    ).toEqual({ preenchidas: 2, total: 3 });
  });

  it('conta 2 fotos para cliente especial (sem etiqueta)', () => {
    expect(
      contarFotosEmbalagem({ ...empty, pacoteFotoUrl: 'a' }, files, 'Da Casa'),
    ).toEqual({ preenchidas: 1, total: 2 });
  });

  it('inclui arquivo novo selecionado', () => {
    expect(
      contarFotosEmbalagem(empty, { ...files, pallet: {} as File }, 'Cliente X'),
    ).toEqual({ preenchidas: 1, total: 3 });
  });
});
