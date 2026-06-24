'use client';

import type { InsumoPendenciaProdutoGrupo } from '@/domain/insumos/insumo-pendencia-grupo';
import { Badge } from '@/components/ui/Badge';

type Props = {
  grupo: InsumoPendenciaProdutoGrupo;
};

export default function InsumoPendenciaProdutoMeta({ grupo }: Props) {
  const { contexto } = grupo;
  const chips: Array<{ key: string; label: string; tone: 'neutral' | 'outline' }> = [];

  if (contexto.cfop) {
    chips.push({ key: 'cfop', label: `CFOP ${contexto.cfop}`, tone: 'outline' });
  }
  if (contexto.ncm) {
    chips.push({ key: 'ncm', label: `NCM ${contexto.ncm}`, tone: 'outline' });
  }

  if (chips.length === 0 && grupo.pendenciaCount <= 1) {
    return null;
  }

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <Badge key={chip.key} tone={chip.tone} pill={false}>
          {chip.label}
        </Badge>
      ))}
      {grupo.pendenciaCount > 1 ? (
        <span className="text-xs text-stone-500">
          {grupo.pendenciaCount} recebimentos pendentes
        </span>
      ) : null}
    </div>
  );
}
