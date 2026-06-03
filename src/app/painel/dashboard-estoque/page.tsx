'use client';

import React from 'react';
import { StockDashboard } from '@/features/stock-dashboard/components/StockDashboard';
import DashboardHeader from '@/components/DashboardHeader';
import { useEffect, useState } from 'react';
import { EstoqueRecord } from '@/domain/types/inventario';

function StockDashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100" />
          ))}
        </div>
        <div className="mt-4 h-11 rounded-xl bg-gray-100" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-72 rounded-2xl border border-gray-200 bg-white"
          />
        ))}
      </div>
    </div>
  );
}

export default function DashboardEstoquePage() {
  const [allStock, setAllStock] = useState<EstoqueRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch('/api/painel/estoque');
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Falha ao carregar estoque');
        setAllStock(json.data || []);
      } catch {
        // Erro ao carregar estoque
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, []);

  return (
    <div className="relative z-0 min-h-screen bg-gray-50">
      <DashboardHeader title="Estoque" icon="inventory_2" />

      <div className="relative z-0 mx-auto max-w-[1600px] p-4 sm:p-6">
        {loading ? (
          <StockDashboardSkeleton />
        ) : (
          <StockDashboard initialData={allStock} />
        )}
      </div>
    </div>
  );
}
