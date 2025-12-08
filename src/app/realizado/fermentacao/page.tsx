'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import ProducaoModal from '@/components/ProducaoModal';
import { RealizadoHeader, ProductCompactCard, ThreeColumnLayout } from '@/components/Realizado';
import { RealizadoItemFermentacao, RealizadoGroup } from '@/domain/types/realizado';
import { QuantityBreakdown } from '@/domain/valueObjects/QuantityBreakdown';
import { useLatestDataDate } from '@/hooks/useLatestDataDate';

type PainelItem = RealizadoItemFermentacao & {
  fermentacaoFotoId?: string;
  fermentacaoFotoUploadedAt?: string;
  pedidoLatas?: number;
  pedidoUnidades?: number;
  pedidoKg?: number;
};

export default function ProducaoFermentacaoPage() {
  const latestDate = useLatestDataDate('fermentacao');
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
        const res = await fetch(`/api/painel/fermentacao?date=${selectedDate}`);
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
      const res = await fetch(`/api/producao/fermentacao/${item.rowId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar dados de produção de fermentação');

      setEditingItem({
        ...item,
        latas: data.data.latas || 0,
        unidades: data.data.unidades || 0,
        kg: data.data.kg || 0,
        pedidoLatas: data.data.pedidoLatas || 0,
        pedidoUnidades: data.data.pedidoUnidades || 0,
        pedidoKg: data.data.pedidoKg || 0,
        fermentacaoFotoUrl: data.data.fermentacaoFotoUrl,
        fermentacaoFotoId: data.data.fermentacaoFotoId,
        fermentacaoFotoUploadedAt: data.data.fermentacaoFotoUploadedAt,
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
      const painelRes = await fetch(`/api/painel/fermentacao?date=${selectedDate}`);
      const painelData = await painelRes.json();
      if (painelRes.ok) {
        setItems((painelData.items || []) as PainelItem[]);
      }
    } catch {
      // Erro ao recarregar dados do painel
    }
  };

  const handleSaveProducao = async (producaoData: { caixas: number; unidades: number; kg: number }) => {
    if (!editingItem?.rowId) return;

    try {
      setProducaoLoading(true);
      setMessage(null);

      const res = await fetch(`/api/producao/fermentacao/${editingItem.rowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latas: producaoData.caixas, unidades: producaoData.unidades, kg: producaoData.kg }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar produção de fermentação');

      setMessage('Produção de fermentação salva com sucesso!');
      await refreshPainelData();
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro ao salvar produção');
    } finally {
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
    <div className="min-h-screen text-white" style={{ backgroundColor: '#8b773a' }}>
      <RealizadoHeader
        title="Realizado: Fermentação"
        icon="🍞"
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
      />

      <div className="p-4">
        {message && (
          <div className={`mb-4 p-4 rounded-md border ${
            message.includes('sucesso') || message.includes('salva')
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
              <div className="bg-slate-800/20 border border-slate-600/30 rounded-lg p-3 space-y-2">
                <div className="border-b border-slate-600/30 pb-1">
                  {/* Header vazio para manter consistência visual */}
                </div>
                
                <div className="space-y-1.5">
                  {group.items.map((item, idx) => {
                    const fermentacaoItem = item as PainelItem;
                    const itemKey = `${fermentacaoItem.produto}-${fermentacaoItem.rowId}`;
                    const isItemLoading = loadingCardId === itemKey;
                    const produzidoDetalhes = QuantityBreakdown.buildEntries([
                      { quantidade: fermentacaoItem.latas, unidade: 'lt' },
                      { quantidade: fermentacaoItem.unidades, unidade: 'un' },
                      { quantidade: fermentacaoItem.kg, unidade: 'kg' },
                    ]);
                    const metaDetalhes = QuantityBreakdown.buildEntries([
                      { quantidade: fermentacaoItem.pedidoLatas, unidade: 'lt' },
                      { quantidade: fermentacaoItem.pedidoUnidades, unidade: 'un' },
                      { quantidade: fermentacaoItem.pedidoKg, unidade: 'kg' },
                    ]);
                    
                    return (
                      <ProductCompactCard
                        key={`${fermentacaoItem.produto}-${idx}`}
                        produto={fermentacaoItem.produto}
                        produzido={fermentacaoItem.produzido}
                        aProduzir={fermentacaoItem.aProduzir}
                        unidade={fermentacaoItem.unidade}
                        hasPhoto={Boolean(fermentacaoItem.fermentacaoFotoUrl)}
                        photoColor="white"
                        onPhotoClick={() => window.open(fermentacaoItem.fermentacaoFotoUrl, '_blank')}
                        onClick={() => handleEditProducao(fermentacaoItem)}
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
          fermentacaoFotoUrl: editingItem.fermentacaoFotoUrl,
          fermentacaoFotoId: editingItem.fermentacaoFotoId,
          fermentacaoFotoUploadedAt: editingItem.fermentacaoFotoUploadedAt,
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
        mode="fermentacao"
      />
    </div>
  );
}
