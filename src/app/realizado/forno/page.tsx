'use client';

import { useEffect, useMemo, useState } from 'react';
import ProducaoModal from '@/components/ProducaoModal';
import { RealizadoHeader, ProductCompactCard, ThreeColumnLayout } from '@/components/Realizado';
import { RealizadoItemForno, RealizadoGroup } from '@/domain/types/realizado';
import { useLatestDataDate } from '@/hooks/useLatestDataDate';
import { QuantityBreakdown } from '@/domain/valueObjects/QuantityBreakdown';

type PainelItem = RealizadoItemForno & {
  fornoFotoId?: string;
  fornoFotoUploadedAt?: string;
  pedidoLatas?: number;
  pedidoUnidades?: number;
  pedidoKg?: number;
};

export default function ProducaoFornoPage() {
  const latestDate = useLatestDataDate('forno');
  const [items, setItems] = useState<PainelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(latestDate);
  const [producaoModalOpen, setProducaoModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PainelItem | null>(null);
  const [producaoLoading, setProducaoLoading] = useState(false);
  const [loadingCardId, setLoadingCardId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedDate(latestDate);
  }, [latestDate]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/painel/forno?date=${selectedDate}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Falha ao carregar painel');
        setItems((data.items || []) as PainelItem[]);
      } catch (err) {
        setMessage(err instanceof Error ? err.message : 'Erro ao carregar o painel');
      } finally {
        setLoading(false);
      }
    };
    load();
    
    if (!producaoModalOpen) {
      const interval = setInterval(load, 60_000);
      return () => clearInterval(interval);
    }
  }, [selectedDate, producaoModalOpen]);

  const handleEditProducao = async (item: PainelItem) => {
    if (!item.rowId) {
      setMessage('Este item não pode ser editado');
      return;
    }
    
    try {
      setLoadingCardId(`${item.produto}-${item.rowId}`);
      setProducaoLoading(true);
      const res = await fetch(`/api/producao/forno/${item.rowId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar dados de produção');

      setEditingItem({
        ...item,
        latas: data.data.latas || 0,
        unidades: data.data.unidades || 0,
        kg: data.data.kg || 0,
        pedidoLatas: data.data.pedidoLatas || 0,
        pedidoUnidades: data.data.pedidoUnidades || 0,
        pedidoKg: data.data.pedidoKg || 0,
        fornoFotoUrl: data.data.fornoFotoUrl,
        fornoFotoId: data.data.fornoFotoId,
        fornoFotoUploadedAt: data.data.fornoFotoUploadedAt,
      });
      setProducaoModalOpen(true);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro ao carregar dados de produção');
    } finally {
      setProducaoLoading(false);
      setLoadingCardId(null);
    }
  };

  const refreshPainelData = async () => {
    try {
      const painelRes = await fetch(`/api/painel/forno?date=${selectedDate}`);
      const painelData = await painelRes.json();
      if (painelRes.ok) setItems((painelData.items || []) as PainelItem[]);
    } catch (err) {
      console.error('Erro ao recarregar dados do painel:', err);
    }
  };

  const handleSaveProducao = async (producaoData: { caixas: number; pacotes: number; unidades: number; kg: number }) => {
    if (!editingItem?.rowId) return;
    
    try {
      setProducaoLoading(true);
      setMessage(null);
      const res = await fetch(`/api/producao/forno/${editingItem.rowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latas: producaoData.caixas, unidades: producaoData.unidades, kg: producaoData.kg })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar produção');
      
      setEditingItem(null);
      setProducaoLoading(false);
      setMessage('Produção atualizada com sucesso!');
      await refreshPainelData();
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro ao salvar produção');
      setProducaoLoading(false);
    }
  };

  const groupedItems = useMemo((): RealizadoGroup[] => {
    const groups: { [key: string]: PainelItem[] } = {};
    items.forEach(item => {
      const groupKey = `${item.dataProducao || selectedDate}`;
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(item);
    });
    
    return Object.entries(groups).map(([groupKey, groupItems]) => ({
      key: groupKey,
      items: groupItems,
    }));
  }, [items, selectedDate]);

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#330804' }}>
      <RealizadoHeader
        title="Realizado: Forno"
        icon="🔥"
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
      />

      <div className="p-4">
        {message && (
          <div className={`mb-4 p-4 rounded-md border ${
            message.includes('sucesso')
              ? 'bg-green-800/30 border-green-600 text-green-100'
              : 'bg-red-800/30 border-red-600 text-red-100'
          }`}>
            {message}
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-gray-400 text-xl">Carregando...</div>
        ) : (
          <ThreeColumnLayout
            groups={groupedItems}
            columnCount={1}
            renderGroup={(group) => (
              <div className="bg-gray-800/20 border border-gray-600/30 rounded-lg p-3 space-y-2">
                <div className="border-b border-gray-600/30 pb-1">
                  {/* Header vazio para manter consistência visual */}
                </div>
                
                <div className="space-y-1.5">
                  {group.items.map((item, itemIndex) => {
                    const fornoItem = item as PainelItem;
                    const itemKey = `${fornoItem.produto}-${fornoItem.rowId}`;
                    const isItemLoading = loadingCardId === itemKey;
                    const produzidoDetalhes = QuantityBreakdown.buildEntries([
                      { quantidade: fornoItem.latas, unidade: 'lt' },
                      { quantidade: fornoItem.unidades, unidade: 'un' },
                      { quantidade: fornoItem.kg, unidade: 'kg' },
                    ]);
                    const metaDetalhes = QuantityBreakdown.buildEntries([
                      { quantidade: fornoItem.pedidoLatas, unidade: 'lt' },
                      { quantidade: fornoItem.pedidoUnidades, unidade: 'un' },
                      { quantidade: fornoItem.pedidoKg, unidade: 'kg' },
                    ]);
                    
                    return (
                      <ProductCompactCard
                        key={`${fornoItem.produto}-${itemIndex}`}
                        produto={fornoItem.produto}
                        produzido={fornoItem.produzido}
                        aProduzir={fornoItem.aProduzir}
                        unidade={fornoItem.unidade}
                        hasPhoto={Boolean(fornoItem.fornoFotoUrl)}
                        photoColor="white"
                        onPhotoClick={() => window.open(fornoItem.fornoFotoUrl, '_blank')}
                        onClick={() => handleEditProducao(fornoItem)}
                        isLoading={isItemLoading}
                        detalhesProduzido={produzidoDetalhes}
                        detalhesMeta={metaDetalhes}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          />
        )}

        <footer className="mt-6 text-center text-gray-400 text-sm">
          {groupedItems.length} grupos • {items.length} itens
        </footer>
      </div>

      <ProducaoModal
        isOpen={producaoModalOpen}
        onClose={() => { setProducaoModalOpen(false); setEditingItem(null); }}
        onSave={handleSaveProducao}
        onSaveSuccess={refreshPainelData}
        initialData={editingItem ? {
          caixas: editingItem.latas || 0,
          pacotes: 0,
          unidades: editingItem.unidades || 0,
          kg: editingItem.kg || 0,
          fornoFotoUrl: editingItem.fornoFotoUrl,
          fornoFotoId: editingItem.fornoFotoId,
          fornoFotoUploadedAt: editingItem.fornoFotoUploadedAt,
        } : undefined}
        produto={editingItem?.produto || ''}
        cliente={''}
        rowId={editingItem?.rowId}
        pedidoQuantidades={editingItem ? {
          caixas: editingItem.pedidoLatas || 0,
          pacotes: 0,
          unidades: editingItem.pedidoUnidades || 0,
          kg: editingItem.pedidoKg || 0,
        } : undefined}
        loading={producaoLoading}
        mode="forno"
      />
    </div>
  );
}
