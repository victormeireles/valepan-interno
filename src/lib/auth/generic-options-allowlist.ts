import type { InternoModuloId, NivelModulo } from './interno-modulos-catalog';

export type GenericOptionsQuery = {
  table: string;
  labelField: string;
  valueField: string;
  extraFields: string[];
};

export type GenericOptionsResolved = {
  table: string;
  labelField: string;
  valueField: string;
  extraFields: string[];
  modulos: readonly InternoModuloId[];
  minimo: NivelModulo;
};

export type GenericOptionsAllowlistResult =
  | { ok: true; resolved: GenericOptionsResolved }
  | { ok: false; status: 400 | 403; error: string };

type TableRule = {
  labelFields: readonly string[];
  valueFields: readonly string[];
  extraFields: readonly string[];
  modulos: readonly InternoModuloId[];
  minimo: NivelModulo;
};

/**
 * Allowlist estrita de tabelas/campos consultáveis via service role em
 * `/api/options/generic`. Qualquer tabela ou campo fora da lista → 403.
 */
const TABLE_RULES: Readonly<Record<string, TableRule>> = {
  produtos: {
    labelFields: ['nome'],
    valueFields: ['id'],
    extraFields: [
      'nome_etiqueta',
      'dias_validade_ambiente',
      'dias_validade_congelado',
      'unit_barcode',
      'box_units',
      'package_units',
      'unit_weight',
      'unidade_padrao_id',
    ],
    modulos: ['interno_etiquetas', 'interno_config'],
    minimo: 'ler',
  },
  tipos_estoque: {
    labelFields: ['nome'],
    valueFields: ['id'],
    extraFields: [
      'possui_etiqueta',
      'congelado',
      'mostrar_texto_congelado',
    ],
    modulos: ['interno_etiquetas', 'interno_config'],
    minimo: 'ler',
  },
  insumos: {
    labelFields: ['nome'],
    valueFields: ['id'],
    extraFields: ['custo_unitario'],
    modulos: ['interno_config'],
    minimo: 'ler',
  },
  unidades: {
    labelFields: ['nome_resumido', 'nome'],
    valueFields: ['id'],
    extraFields: ['codigo'],
    modulos: ['interno_config', 'interno_insumos'],
    minimo: 'ler',
  },
};

export const GENERIC_OPTIONS_ALLOWED_TABLES = Object.freeze(
  Object.keys(TABLE_RULES),
);

function isAllowedField(field: string, allowed: readonly string[]): boolean {
  return allowed.includes(field);
}

export class GenericOptionsAllowlist {
  resolve(query: GenericOptionsQuery): GenericOptionsAllowlistResult {
    const table = query.table.trim();
    if (!table) {
      return { ok: false, status: 400, error: 'Table parameter is required' };
    }

    const rule = TABLE_RULES[table];
    if (!rule) {
      return { ok: false, status: 403, error: 'Tabela não permitida' };
    }

    const labelField = query.labelField.trim() || 'nome';
    const valueField = query.valueField.trim() || 'id';
    const extraFields = query.extraFields
      .map((field) => field.trim())
      .filter(Boolean);

    if (!isAllowedField(labelField, rule.labelFields)) {
      return { ok: false, status: 403, error: 'labelField não permitido' };
    }

    if (!isAllowedField(valueField, rule.valueFields)) {
      return { ok: false, status: 403, error: 'valueField não permitido' };
    }

    for (const field of extraFields) {
      if (!isAllowedField(field, rule.extraFields)) {
        return { ok: false, status: 403, error: 'extraFields não permitido' };
      }
    }

    return {
      ok: true,
      resolved: {
        table,
        labelField,
        valueField,
        extraFields,
        modulos: rule.modulos,
        minimo: rule.minimo,
      },
    };
  }
}
