'use client';

import { useEffect, useMemo, useState } from 'react';
import EditModal from '@/components/EditModal';
import CreatePedidoModal from '@/components/CreatePedidoModal';
import CalendarDateFilter from '@/components/FormControls/CalendarDateFilter';
import { formatIsoDateToDDMMYYYY, getTodayISOInBrazilTimezone } from '@/lib/utils/date-utils';

type PainelItem = {
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
  // Foto
  fornoFotoUrl?: string;
  fornoFotoId?: string;
  fornoFotoUploadedAt?: string;
  // Observação
  observacao?: string;
};

type CreatePedidoData = {
  dataProducao: string;
  itens: { produto: string; latas: number; unidades: number; kg: number; tipoCliente?: string | null; observacao?: string }[];
};

type EditData = {
  dataProducao: string;
  produto: string;
  latas: number;
  unidades: number;
  kg: number;
  observacao?: string;
};

function formatUnidade(u: PainelItem['unidade']): string {
  switch (u) {
    case 'lt': return 'LT';
    case 'un': return 'UN';
    case 'kg': return 'KG';
  }
}

export default function PedidoFornoPage() {
  const [items, setItems] = useState<PainelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => getTodayISOInBrazilTimezone());

  // Estados para edição
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PainelItem | null>(null);
  const [isNewOrder, setIsNewOrder] = useState(false);
  const [produtosOptions, setProdutosOptions] = useState<string[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [loadingCardId, setLoadingCardId] = useState<string | null>(null);

  // Estados para criação
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

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

    if (!editModalOpen && !createModalOpen) {
      const interval = setInterval(load, 60_000);
      return () => clearInterval(interval);
    }
  }, [selectedDate, editModalOpen, createModalOpen]);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const produtosRes = await fetch('/api/options/forno?type=produtos');
        const produtosData = await produtosRes.json();
        if (produtosRes.ok) setProdutosOptions(produtosData.options || []);
      } catch (err) {
        console.error('Erro ao carregar opções:', err);
      }
    };
    loadOptions();
  }, []);

  const handleEditItem = async (item: PainelItem) => {
    if (!item.rowId) {
      setMessage('Este item não pode ser editado');
      return;
    }

    try {
      setLoadingCardId(`${item.produto}-${item.rowId}`);
      setEditLoading(true);
      const res = await fetch(`/api/forno/edit/${item.rowId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar dados para edição');

      setEditingItem({
        ...item,
        dataProducao: data.data.dataProducao,
        produto: data.data.produto,
        aProduzir: item.aProduzir,
        produzido: item.produzido,
        latas: data.data.latas || 0,
        unidades: data.data.unidades || 0,
        kg: data.data.kg || 0,
        observacao: data.data.observacao,
      });
      setIsNewOrder(false);
      setEditModalOpen(true);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro ao carregar dados para edição');
    } finally {
      setEditLoading(false);
      setLoadingCardId(null);
    }
  };

  const handleNewOrder = () => {
    setCreateModalOpen(true);
  };

  const handleCreatePedido = async (createData: CreatePedidoData) => {
    try {
      setCreateLoading(true);
      setMessage(null);

      // Criar meta de produção
      const res = await fetch('/api/submit/forno-pedido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao criar pedido');

      // Criar meta de embalagem para itens que tiverem tipoCliente preenchido
      const itensComEmbalagem = createData.itens.filter(item => item.tipoCliente);
      
      for (const item of itensComEmbalagem) {
        try {
          // Buscar dados do produto para conversão
          const produtoRes = await fetch(`/api/produtos/${encodeURIComponent(item.produto)}/conversao`);
          const produtoData = await produtoRes.json();
          
          if (!produtoRes.ok || !produtoData.box_units || produtoData.box_units === 0 || 
              !produtoData.unidades_assadeiras || produtoData.unidades_assadeiras === 0) {
            console.warn(`Produto ${item.produto} não possui dados de conversão configurados, pulando criação de meta de embalagem`);
            continue;
          }
          
          // Calcular caixas: (latas * unidades_assadeiras) / box_units
          // Arredondar para baixo (floor) para garantir que não exceda a quantidade disponível
          const caixas = Math.floor((item.latas * produtoData.unidades_assadeiras) / produtoData.box_units);
          
          // Criar meta de embalagem
          const embalagemRes = await fetch('/api/submit/embalagem-pedido', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dataPedido: createData.dataProducao,
              dataFabricacao: createData.dataProducao,
              cliente: item.tipoCliente,
              observacao: item.observacao || '',
              itens: [{
                produto: item.produto,
                congelado: false,
                caixas: caixas,
                pacotes: 0,
                unidades: 0,
                kg: 0,
              }]
            }),
          });
          
          if (!embalagemRes.ok) {
            const embalagemData = await embalagemRes.json();
            console.error(`Erro ao criar meta de embalagem para ${item.produto}:`, embalagemData.error);
          }
        } catch (err) {
          console.error(`Erro ao criar meta de embalagem para ${item.produto}:`, err);
        }
      }

      setMessage('Pedido criado com sucesso!');

      const painelRes = await fetch(`/api/painel/forno?date=${selectedDate}`);
      const painelData = await painelRes.json();
      if (painelRes.ok) setItems((painelData.items || []) as PainelItem[]);

      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro ao criar pedido');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleSaveEdit = async (editData: EditData) => {
    try {
      setEditLoading(true);
      setMessage(null);
      if (!editingItem?.rowId) return;

      const res = await fetch(`/api/forno/edit/${editingItem.rowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar edição');

      setMessage('Pedido editado com sucesso!');

      const painelRes = await fetch(`/api/painel/forno?date=${selectedDate}`);
      const painelData = await painelRes.json();
      if (painelRes.ok) setItems((painelData.items || []) as PainelItem[]);

      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!editingItem?.rowId) return;
    try {
      setEditLoading(true);
      setMessage(null);
      const res = await fetch(`/api/forno/delete/${editingItem.rowId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao deletar pedido');
      setMessage('Pedido deletado com sucesso!');
      const painelRes = await fetch(`/api/painel/forno?date=${selectedDate}`);
      const painelData = await painelRes.json();
      if (painelRes.ok) setItems((painelData.items || []) as PainelItem[]);
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro ao deletar pedido');
    } finally {
      setEditLoading(false);
    }
  };

  const groupedItems = useMemo(() => {
    const groups: { [key: string]: PainelItem[] } = {};
    items.forEach(item => {
      const groupKey = `${item.dataProducao || selectedDate}`;
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(item);
    });
    return groups;
  }, [items, selectedDate]);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="mx-auto">
        <header className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <span className="text-3xl">📋</span>
              Meta de Produção
            </h1>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <button onClick={handleNewOrder} className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm">+ Novo Pedido</button>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <label htmlFor="date-filter" className="text-gray-300 text-sm font-medium whitespace-nowrap">Data:</label>
                <div className="flex-1 sm:flex-none min-w-[12rem] max-w-[18rem]">
                  <CalendarDateFilter
                    id="date-filter"
                    value={selectedDate}
                    onChange={(d) => {
                      if (d !== null) setSelectedDate(d);
                    }}
                    label="Data da meta de produção"
                    wrapperClassName="inline-flex min-h-10 w-full items-center gap-2"
                    nativePickerClassName="min-h-10 min-w-0 flex-1 cursor-pointer rounded-lg border border-gray-600 bg-gray-800 px-2.5 py-2 text-sm text-white shadow-sm outline-none transition [color-scheme:dark] focus:border-blue-400 focus:ring-2 focus:ring-blue-300/40"
                    todayButtonClassName="min-h-10 shrink-0 rounded-lg border border-gray-600 bg-gray-900 px-2.5 text-xs font-semibold text-blue-100 transition hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                  />
                </div>
              </div>
              <div className="text-gray-300 text-sm hidden sm:block">Atualiza automaticamente</div>
            </div>
          </div>
        </header>

        {message && (
          <div className={`mb-4 p-4 rounded-md border ${
            message.includes('sucesso') || message.includes('criado') || message.includes('editado') || message.includes('deletado')
              ? 'bg-green-800/30 border-green-600 text-green-100'
              : 'bg-red-800/30 border-red-600 text-red-100'
          }`}>{message}</div>
        )}

        {loading ? (
          <div className="text-center py-16 text-gray-400 text-xl">Carregando...</div>
        ) : (
          <div className="flex flex-wrap gap-6">
            {Object.entries(groupedItems).map(([groupKey, groupItems]) => (
              <div key={groupKey} className="bg-slate-800/20 border border-slate-600/30 rounded-lg p-4 space-y-3 w-full lg:inline-block lg:w-auto">
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white">Data: {formatIsoDateToDDMMYYYY(groupKey)}</h3>
                  <div className="text-gray-300 text-sm">{groupItems.length} produto{groupItems.length !== 1 ? 's' : ''}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {groupItems.map((item, idx) => {
                    const progressoItem = item.aProduzir > 0 ? Math.min((item.produzido / item.aProduzir) * 100, 100) : 0;
                    const itemKey = `${item.produto}-${item.rowId}`;
                    const isItemLoading = loadingCardId === itemKey;
                    return (
                      <div key={`${item.produto}-${idx}`} className={`p-2.5 rounded-lg cursor-pointer hover:shadow-lg transition-all duration-200 relative w-full sm:w-64 lg:min-w-[350px] flex-shrink-0 ${item.produzido === 0 ? 'bg-red-900/20 border border-red-500/30' : 'bg-slate-800/40'} ${isItemLoading ? 'opacity-75 pointer-events-none' : ''}`} onClick={() => handleEditItem(item)}>
                        {isItemLoading && (
                          <div className="absolute inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center rounded-lg">
                            <div className="flex flex-col items-center space-y-2">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                              <span className="text-white text-xs font-medium">Carregando...</span>
                            </div>
                          </div>
                        )}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex flex-col gap-0.5 flex-1">
                            <div className="flex items-center gap-1">
                              <span className="font-semibold text-white text-sm">{item.produto}</span>
                            </div>
                            {item.observacao && (
                              <span className="text-xs text-gray-400 italic">{item.observacao}</span>
                            )}
                          </div>
                          <div className="text-right ml-2 flex-shrink-0">
                            <div className="text-base font-bold text-white">{item.produzido} / {item.aProduzir} {formatUnidade(item.unidade)}</div>
                          </div>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                          <div className={`h-2 rounded-full transition-all duration-300 ${item.produzido === 0 ? 'bg-red-500 animate-pulse shadow-lg shadow-red-500/50' : item.produzido < item.aProduzir ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${progressoItem}%` }}></div>
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
          {Object.keys(groupedItems).length} grupos • {items.length} itens • {formatIsoDateToDDMMYYYY(selectedDate)}
        </footer>
      </div>

      {/* Modal de Edição */}
      <EditModal
        isOpen={editModalOpen}
        onClose={() => { setEditModalOpen(false); setEditingItem(null); setIsNewOrder(false); }}
        onSave={async (data) => handleSaveEdit({
          dataProducao: data.dataPedido,
          produto: data.produto,
          latas: data.caixas,
          unidades: data.unidades,
          kg: data.kg,
          observacao: data.observacao,
        })}
        onDelete={!isNewOrder ? handleDeleteOrder : undefined}
        rowId={isNewOrder ? undefined : editingItem?.rowId}
        initialData={isNewOrder ? {
          dataPedido: selectedDate,
          dataFabricacao: selectedDate,
          cliente: '',
          observacao: '',
          produto: '',
          congelado: false,
          caixas: 0,
          pacotes: 0,
          unidades: 0,
          kg: 0,
        } : editingItem ? {
          dataPedido: editingItem.dataProducao || selectedDate,
          dataFabricacao: selectedDate,
          cliente: '',
          observacao: editingItem.observacao || '',
          produto: editingItem.produto,
          congelado: false,
          caixas: editingItem.latas || 0,
          pacotes: 0,
          unidades: editingItem.unidades || 0,
          kg: editingItem.kg || 0,
        } : undefined}
        clientesOptions={[]}
        produtosOptions={produtosOptions}
        loading={editLoading}
        visibleFields={{ dataFabricacao: false, cliente: false, observacao: true, congelado: false, pacotes: false }}
        labelsOverride={{ caixas: 'Latas' }}
      />

      {/* Modal de Criação de Pedido */}
      <CreatePedidoModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={async (data) => handleCreatePedido({
          dataProducao: data.dataPedido,
          itens: data.itens.map(i => ({ 
            produto: i.produto, 
            latas: i.caixas, 
            unidades: i.unidades, 
            kg: i.kg,
            tipoCliente: i.tipoCliente || null,
            observacao: data.observacao || '' // Usar observação geral do pedido para cada item
          }))
        })}
        clientesOptions={[]}
        produtosOptions={produtosOptions}
        loading={createLoading}
        visibleFields={{ dataFabricacao: false, cliente: false, observacao: true, congelado: false, pacotes: false }}
        labelsOverride={{ caixas: 'Latas' }}
      />
    </div>
  );
}


