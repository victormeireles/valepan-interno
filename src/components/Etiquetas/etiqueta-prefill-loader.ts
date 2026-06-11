import type {
  EtiquetaProdutoInput,
  EtiquetaTipoInput,
} from '@/domain/etiquetas/etiqueta-resolver';

type GenericOption = {
  value: string;
  label: string;
  meta?: Record<string, unknown>;
};

export async function fetchEtiquetaGenericOptions(
  table: string,
  extraFields: string[],
): Promise<GenericOption[]> {
  const params = new URLSearchParams({
    table,
    labelField: 'nome',
    valueField: 'id',
    extraFields: extraFields.join(','),
  });
  const res = await fetch(`/api/options/generic?${params}`);
  if (!res.ok) throw new Error('Erro ao carregar dados');
  const data = await res.json();
  return data.options ?? [];
}

export function mapProdutoFromGenericOption(option: GenericOption): EtiquetaProdutoInput {
  const meta = option.meta ?? {};
  return {
    nome: option.label,
    nomeEtiqueta: (meta.nome_etiqueta as string | null) ?? null,
    diasValidadeAmbiente: Number(meta.dias_validade_ambiente ?? 21),
    diasValidadeCongelado: Number(meta.dias_validade_congelado ?? 90),
    unitBarcode: (meta.unit_barcode as string | null) ?? null,
    unitWeight: meta.unit_weight != null ? Number(meta.unit_weight) : null,
    boxUnits: meta.box_units != null ? Number(meta.box_units) : null,
    packageUnits: meta.package_units != null ? Number(meta.package_units) : null,
  };
}

export function mapTipoFromGenericOption(option: GenericOption): EtiquetaTipoInput {
  const meta = option.meta ?? {};
  return {
    congelado: Boolean(meta.congelado),
    mostrarTextoCongelado: Boolean(meta.mostrar_texto_congelado),
  };
}

export async function loadEtiquetaPrefillData(
  produtoId: string,
  tipoEstoqueId: string,
): Promise<{ produto: EtiquetaProdutoInput; tipo: EtiquetaTipoInput }> {
  const [produtoOptions, tipoOptions] = await Promise.all([
    fetchEtiquetaGenericOptions('produtos', [
      'nome_etiqueta',
      'dias_validade_ambiente',
      'dias_validade_congelado',
      'unit_barcode',
      'box_units',
      'package_units',
      'unit_weight',
    ]),
    fetchEtiquetaGenericOptions('tipos_estoque', [
      'congelado',
      'mostrar_texto_congelado',
    ]),
  ]);

  const produtoOption = produtoOptions.find((o) => o.value === produtoId);
  const tipoOption = tipoOptions.find((o) => o.value === tipoEstoqueId);

  if (!produtoOption || !tipoOption) {
    throw new Error('Produto ou tipo de estoque não encontrado');
  }

  return {
    produto: mapProdutoFromGenericOption(produtoOption),
    tipo: mapTipoFromGenericOption(tipoOption),
  };
}
