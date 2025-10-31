'use client';

import { ReactNode, useMemo } from 'react';
import { RealizadoGroup } from '@/domain/types/realizado';

interface ThreeColumnLayoutProps {
  groups: RealizadoGroup[];
  renderGroup: (group: RealizadoGroup) => ReactNode;
}

export default function ThreeColumnLayout({
  groups,
  renderGroup,
}: ThreeColumnLayoutProps) {
  // Algoritmo para distribuir grupos entre 2 colunas de forma balanceada
  // PRESERVA A ORDEM ORIGINAL dos grupos (importante para manter ordem da planilha)
  // A ordem é mantida quando lida verticalmente (col1 topo->baixo, depois col2 topo->baixo)
  // Usa round-robin alternado para garantir ordem: 1->col1, 2->col2, 3->col1, 4->col2, etc.
  const columns = useMemo(() => {
    const col1: RealizadoGroup[] = [];
    const col2: RealizadoGroup[] = [];
    
    // Distribuir grupos usando round-robin alternado
    // Isso garante que quando lido verticalmente, a ordem seja: 1, 2, 3, 4, 5...
    groups.forEach((group, index) => {
      // Alterna entre colunas (0 -> col1, 1 -> col2, 2 -> col1, 3 -> col2, ...)
      if (index % 2 === 0) {
        col1.push(group);
      } else {
        col2.push(group);
      }
    });
    
    return [col1, col2];
  }, [groups]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 auto-rows-min">
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

