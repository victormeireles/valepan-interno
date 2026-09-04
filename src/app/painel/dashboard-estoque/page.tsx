'use client';

import { useCallback, useEffect, useState } from 'react';
import { EstoqueRecord } from '@/domain/types/inventario';
import { StockDashboard } from '@/features/stock-dashboard/components/StockDashboard';
import { usePainelAutoRefresh } from '@/hooks/usePainelAutoRefresh';
import { PAINEL_FETCH_INIT } from '@/lib/painel/painel-fetch';

function StockDashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-4">
        <div className="flex justify-between gap-4">
          <div className="h-8 w-32 rounded-lg bg-stone-100" />
          <div className="h-9 w-56 rounded-[9px] bg-stone-100" />
        </div>
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-20 rounded-full bg-stone-100" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-xl border border-stone-200 bg-white" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-72 rounded-2xl border border-stone-200 bg-white"
          />
        ))}
      </div>
    </div>
  );
}

export default function DashboardEstoquePage() {
  const [allStock, setAllStock] = useState<EstoqueRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async (showSpinner: boolean) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await fetch(`/api/painel/estoque?_=${Date.now()}`, PAINEL_FETCH_INIT);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Falha ao carregar estoque');
      setAllStock(json.data || []);
    } catch {
      // Erro ao carregar estoque
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData(true);
  }, [loadData]);

  usePainelAutoRefresh(() => {
    void loadData(false);
  });

  return (
    <div className="relative z-0 min-h-screen">
      {loading ? (
        <StockDashboardSkeleton />
      ) : (
        <StockDashboard initialData={allStock} />
      )}
    </div>
  );
}
