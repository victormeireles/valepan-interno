import { describe, expect, it } from 'vitest';
import {
  GENERIC_OPTIONS_ALLOWED_TABLES,
  GenericOptionsAllowlist,
} from './generic-options-allowlist';

describe('GenericOptionsAllowlist', () => {
  const allowlist = new GenericOptionsAllowlist();

  it('lista só tabelas conhecidas do app', () => {
    expect(GENERIC_OPTIONS_ALLOWED_TABLES).toEqual([
      'produtos',
      'tipos_estoque',
      'insumos',
      'unidades',
    ]);
  });

  it('aceita produtos com campos de etiqueta', () => {
    const result = allowlist.resolve({
      table: 'produtos',
      labelField: 'nome',
      valueField: 'id',
      extraFields: ['nome_etiqueta', 'unit_barcode', 'box_units'],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.resolved.modulos).toContain('interno_etiquetas');
  });

  it('rejeita tabela desconhecida com 403', () => {
    expect(
      allowlist.resolve({
        table: 'usuarios',
        labelField: 'nome',
        valueField: 'id',
        extraFields: [],
      }),
    ).toEqual({
      ok: false,
      status: 403,
      error: 'Tabela não permitida',
    });
  });

  it('rejeita extraField fora da allowlist', () => {
    expect(
      allowlist.resolve({
        table: 'insumos',
        labelField: 'nome',
        valueField: 'id',
        extraFields: ['senha_hash'],
      }),
    ).toEqual({
      ok: false,
      status: 403,
      error: 'extraFields não permitido',
    });
  });

  it('exige table', () => {
    expect(
      allowlist.resolve({
        table: '',
        labelField: 'nome',
        valueField: 'id',
        extraFields: [],
      }).status,
    ).toBe(400);
  });

  it('mapeia unidades para config ou insumos', () => {
    const result = allowlist.resolve({
      table: 'unidades',
      labelField: 'nome_resumido',
      valueField: 'id',
      extraFields: ['codigo'],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.resolved.modulos).toEqual([
      'interno_config',
      'interno_insumos',
    ]);
  });
});
