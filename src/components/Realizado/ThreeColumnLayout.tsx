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
  const columns = useMemo(() => {
    const col1: RealizadoGroup[] = [];
    const col2: RealizadoGroup[] = [];
    
    // Calcular "peso" de cada grupo (número de itens)
    const groupsWithWeight = groups.map(group => ({
      group,
      weight: group.items.length,
    }));
    
    // Ordenar por peso (maior primeiro) para melhor distribuição
    groupsWithWeight.sort((a, b) => b.weight - a.weight);
    
    // Distribuir grupos sempre colocando na coluna com menor peso total
    const columnWeights = [0, 0];
    const columnArrays = [col1, col2];
    
    groupsWithWeight.forEach(({ group, weight }) => {
      // Encontrar coluna com menor peso
      const minWeightIndex = columnWeights.indexOf(Math.min(...columnWeights));
      
      // Adicionar grupo à coluna
      columnArrays[minWeightIndex].push(group);
      columnWeights[minWeightIndex] += weight;
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

