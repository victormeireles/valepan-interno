import type { InsumoCatalogoItem } from '@/domain/insumos/insumo-vinculo-sugestao';

function parseCustoUnitario(raw: string | number | undefined): number | null {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number') return Number.isNaN(raw) ? null : raw;
  const parsed = parseFloat(String(raw));
  return Number.isNaN(parsed) ? null : parsed;
}

type OptionsResponse = {
  options?: Array<{
    value: string;
    label: string;
    meta?: Record<string, string | number>;
  }>;
};

export async function fetchInsumoCatalogo(): Promise<InsumoCatalogoItem[]> {
  const res = await fetch(
    '/api/options/generic?table=insumos&labelField=nome&extraFields=custo_unitario',
  );
  if (!res.ok) throw new Error('Falha ao carregar insumos');

  const data = (await res.json()) as OptionsResponse;
  return (data.options ?? []).map((opt) => ({
    id: opt.value,
    nome: opt.label.replace(/\s*\([^)]+\)$/, ''),
    unidadeCodigo: String(opt.meta?.unidadeCodigo ?? ''),
    unidadeNome: String(opt.meta?.unidadeNomeResumido ?? opt.meta?.unidadeCodigo ?? ''),
    custoUnitario: parseCustoUnitario(opt.meta?.custo_unitario),
  }));
}
