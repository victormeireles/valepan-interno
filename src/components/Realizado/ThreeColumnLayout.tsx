'use client';

import { ReactNode, useMemo } from 'react';
import { RealizadoGroup } from '@/domain/types/realizado';

interface ThreeColumnLayoutProps {
  groups: RealizadoGroup[];
  renderGroup: (group: RealizadoGroup) => ReactNode;
  columnCount?: number;
}

export default function ThreeColumnLayout({
  groups,
  renderGroup,
  columnCount = 2,
}: ThreeColumnLayoutProps) {
  // Algoritmo para distribuir grupos entre colunas de forma balanceada
  // PRESERVA A ORDEM ORIGINAL dos grupos (importante para manter ordem da planilha)
  // A ordem é mantida quando lida verticalmente (col1 topo->baixo, depois col2 topo->baixo, ...)
  // Usa round-robin alternado para garantir ordem: 1->col1, 2->col2, 3->col3, etc.
  const totalColumns = Math.max(1, Math.floor(columnCount));

  const columns = useMemo(() => {
    const buckets: RealizadoGroup[][] = Array.from({ length: totalColumns }, () => []);

    groups.forEach((group, index) => {
      const targetColumn = totalColumns === 1 ? 0 : index % totalColumns;
      buckets[targetColumn].push(group);
    });

    return buckets;
  }, [groups, totalColumns]);

  const gridClassName = (() => {
    if (totalColumns === 1) return 'grid grid-cols-1 gap-4 auto-rows-min';
    if (totalColumns === 2) return 'grid grid-cols-1 lg:grid-cols-2 gap-4 auto-rows-min';
    if (totalColumns === 3) return 'grid grid-cols-1 lg:grid-cols-3 gap-4 auto-rows-min';
    return 'grid grid-cols-1 lg:grid-cols-4 gap-4 auto-rows-min';
  })();

  return (
    <div className={gridClassName}>
      {columns.map((columnGroups, columnIndex) => (
        <div key={columnIndex} className="space-y-4">
          {columnGroups.map((group) => (
            <div key={group.key}>
              {renderGroup(group)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

