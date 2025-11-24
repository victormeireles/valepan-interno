'use client';

import { useEffect, useState } from 'react';

type ApiEndpoint = 'embalagem' | 'fermentacao' | 'forno' | 'saidas';

/**
 * Hook para buscar a última data com dados disponíveis
 * @param endpoint - Qual API consultar (embalagem, fermentação ou forno)
 * @returns A data mais recente com dados ou a data de hoje como fallback
 */
export function useLatestDataDate(endpoint: ApiEndpoint): string {
  const [latestDate, setLatestDate] = useState<string>(() => {
    // Fallback inicial: data de hoje
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  useEffect(() => {
    const fetchLatestDate = async () => {
      try {
        // Tentar buscar dados das últimas 7 datas
        const today = new Date();
        
        for (let i = 0; i < 7; i++) {
          const checkDate = new Date(today);
          checkDate.setDate(checkDate.getDate() - i);
          
          const yyyy = checkDate.getFullYear();
          const mm = String(checkDate.getMonth() + 1).padStart(2, '0');
          const dd = String(checkDate.getDate()).padStart(2, '0');
          const dateString = `${yyyy}-${mm}-${dd}`;
          
          const res = await fetch(`/api/painel/${endpoint}?date=${dateString}`);
          
          if (res.ok) {
            const data = await res.json();
            // Se tem itens, essa é a última data com dados
            if (data.items && data.items.length > 0) {
              setLatestDate(dateString);
              return;
            }
          }
        }
        
        // Se não encontrou dados nos últimos 7 dias, manter data de hoje
      } catch (_error) {
        // Em caso de erro, manter data de hoje
      }
    };

    fetchLatestDate();
  }, [endpoint]);

  return latestDate;
}

