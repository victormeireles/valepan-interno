import type { InsumoCatalogoItem } from '@/domain/insumos/insumo-vinculo-sugestao';

type OptionsResponse = {
  options?: Array<{
    value: string;
    label: string;
    meta?: Record<string, string>;
  }>;
};

export async function fetchInsumoCatalogo(): Promise<InsumoCatalogoItem[]> {
  const res = await fetch('/api/options/generic?table=insumos&labelField=nome');
  if (!res.ok) throw new Error('Falha ao carregar insumos');

  const data = (await res.json()) as OptionsResponse;
  return (data.options ?? []).map((opt) => ({
    id: opt.value,
    nome: opt.label.replace(/\s*\([^)]+\)$/, ''),
    unidadeCodigo: String(opt.meta?.unidadeCodigo ?? ''),
    unidadeNome: String(opt.meta?.unidadeNomeResumido ?? opt.meta?.unidadeCodigo ?? ''),
  }));
}
