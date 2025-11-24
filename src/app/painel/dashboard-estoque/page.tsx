'use client';

import React from 'react';
import { StockDashboard } from '@/features/stock-dashboard/components/StockDashboard';
import DashboardHeader from '@/components/DashboardHeader';
import { useEffect, useState } from 'react';
import { EstoqueRecord } from '@/domain/types/inventario';

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
      } catch (_error) {
        // Erro ao carregar estoque
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 relative z-0">
      <DashboardHeader title="Estoque" icon="📊" />
      
      <div className="p-6 max-w-[1600px] mx-auto relative z-0">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando dados do estoque...</div>
        ) : (
          <StockDashboard initialData={allStock} />
        )}
      </div>
    </div>
  );
}

