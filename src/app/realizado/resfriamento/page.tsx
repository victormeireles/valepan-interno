'use client';

import { useEffect, useMemo, useState } from 'react';
import ProducaoModal from '@/components/ProducaoModal';

type PainelItemResfriamento = {
  produto: string;
  unidade: 'lt' | 'un' | 'kg';
  aProduzir: number;
  produzido: number;
  dataProducao?: string;
  rowId?: number;
  // Valores individuais para edição
  latas?: number;
  unidades?: number;
  kg?: number;
  pedidoLatas?: number;
  pedidoUnidades?: number;
  pedidoKg?: number;
  // Foto
  resfriamentoFotoUrl?: string;
  resfriamentoFotoId?: string;
  resfriamentoFotoUploadedAt?: string;
};

function formatUnidade(u: PainelItemResfriamento['unidade']): string {
  switch (u) {
    case 'lt': return 'LT';
    case 'un': return 'UN';
    case 'kg': return 'KG';
  }
}

function formatDateManual(dateString: string): string {
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const [, month, day] = parts;
    return `${day}/${month}`;
  }
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

function formatDateFull(dateString: string): string {
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export default function ProducaoResfriamentoPage() {
  const [items, setItems] = useState<PainelItemResfriamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  // Estados para edição
  const [producaoModalOpen, setProducaoModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PainelItemResfriamento | null>(null);
  const [producaoLoading, setProducaoLoading] = useState(false);
  const [loadingCardId, setLoadingCardId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/painel/resfriamento?date=${selectedDate}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Falha ao carregar painel');
        setItems((data.items || []) as PainelItemResfriamento[]);
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

  const handleEditProducao = async (item: PainelItemResfriamento) => {
    if (!item.rowId) {
      setMessage('Este item não pode ser editado');
      return;
    }

    try {
      setLoadingCardId(`${item.produto}-${item.rowId}`);
      setProducaoLoading(true);
      const res = await fetch(`/api/producao/resfriamento/${item.rowId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar dados de produção de resfriamento');

      setEditingItem({
        ...item,
        latas: data.data.latas || 0,
        unidades: data.data.unidades || 0,
        kg: data.data.kg || 0,
        pedidoLatas: data.data.pedidoLatas || 0,
        pedidoUnidades: data.data.pedidoUnidades || 0,
        pedidoKg: data.data.pedidoKg || 0,
        resfriamentoFotoUrl: data.data.resfriamentoFotoUrl,
        resfriamentoFotoId: data.data.resfriamentoFotoId,
        resfriamentoFotoUploadedAt: data.data.resfriamentoFotoUploadedAt,
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
      const painelRes = await fetch(`/api/painel/resfriamento?date=${selectedDate}`);
      const painelData = await painelRes.json();
      if (painelRes.ok) {
        setItems((painelData.items || []) as PainelItemResfriamento[]);
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

      const res = await fetch(`/api/producao/resfriamento/${editingItem.rowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latas: producaoData.caixas, unidades: producaoData.unidades, kg: producaoData.kg }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar produção de resfriamento');

      setMessage('Produção de resfriamento salva com sucesso!');
      await refreshPainelData();

      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro ao salvar produção');
    } finally {
      setProducaoLoading(false);
    }
  };

  const groupedItems = useMemo(() => {
    const groups: { [key: string]: PainelItemResfriamento[] } = {};
    items.forEach(item => {
      const groupKey = `${item.dataProducao || selectedDate}`;
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(item);
    });
    return groups;
  }, [items, selectedDate]);

  return (
    <div className="min-h-screen text-white p-6" style={{ backgroundColor: '#1e40af' }}>
      <div className="mx-auto">
        <header className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <span className="text-3xl">❄️</span>
              Realizado: Resfriamento
            </h1>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <label htmlFor="date-filter" className="text-gray-300 text-sm font-medium whitespace-nowrap">Data:</label>
                <input
                  id="date-filter"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="flex-1 sm:flex-none px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
              </div>
              <div className="text-gray-300 text-sm hidden sm:block">Atualiza automaticamente</div>
            </div>
          </div>
        </header>

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
          <div className="flex flex-wrap gap-6">
            {Object.entries(groupedItems).map(([groupKey, groupItems]) => (
              <div key={groupKey} className="bg-slate-800/20 border border-slate-600/30 rounded-lg p-4 space-y-3 w-full lg:inline-block lg:w-auto">
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white">Data: {formatDateManual(groupKey)}</h3>
                  <div className="text-gray-300 text-sm">{groupItems.length} produto{groupItems.length !== 1 ? 's' : ''}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {groupItems.map((item, idx) => {
                    const progressoItem = item.aProduzir > 0 ? Math.min((item.produzido / item.aProduzir) * 100, 100) : 0;
                    const itemKey = `${item.produto}-${item.rowId}`;
                    const isItemLoading = loadingCardId === itemKey;
                    return (
                      <div
                        key={`${item.produto}-${idx}`}
                        className={`p-2.5 rounded-lg cursor-pointer hover:shadow-lg transition-all duration-200 relative w-full sm:w-64 lg:min-w-[350px] flex-shrink-0 ${
                          item.produzido === 0 ? 'bg-red-900/20 border border-red-500/30' : 'bg-slate-800/40'
                        } ${isItemLoading ? 'opacity-75 pointer-events-none' : ''}`}
                        onClick={() => handleEditProducao(item)}
                      >
                        {isItemLoading && (
                          <div className="absolute inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center rounded-lg">
                            <div className="flex flex-col items-center space-y-2">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                              <span className="text-white text-xs font-medium">Carregando...</span>
                            </div>
                          </div>
                        )}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-1 flex-1">
                            <span className="font-semibold text-white text-sm">{item.produto}</span>
                            {item.resfriamentoFotoUrl && (
                              <div className="relative ml-2">
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    window.open(item.resfriamentoFotoUrl, '_blank');
                                  }}
                                  className="text-white hover:text-gray-300 transition-colors cursor-pointer"
                                  title="Ver foto do resfriamento"
                                >
                                  <span className="material-icons text-lg">photo_camera</span>
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="text-right ml-2 flex-shrink-0">
                            <div className="text-base font-bold text-white">
                              {item.produzido} / {item.aProduzir} {formatUnidade(item.unidade)}
                            </div>
                          </div>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              item.produzido === 0
                                ? 'bg-red-500 animate-pulse shadow-lg shadow-red-500/50'
                                : item.produzido < item.aProduzir
                                ? 'bg-blue-400'
                                : 'bg-blue-500'
                            }`}
                            style={{ width: `${progressoItem}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <footer className="mt-6 text-center text-gray-400 text-sm">
          {Object.keys(groupedItems).length} grupos • {items.length} itens • {formatDateFull(selectedDate)}
        </footer>
      </div>

      {/* Modal de Produção */}
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
          resfriamentoFotoUrl: editingItem.resfriamentoFotoUrl,
          resfriamentoFotoId: editingItem.resfriamentoFotoId,
          resfriamentoFotoUploadedAt: editingItem.resfriamentoFotoUploadedAt,
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
        mode="resfriamento"
      />
    </div>
  );
}

