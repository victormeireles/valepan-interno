'use client';

import { useEffect, useMemo, useState } from 'react';
import EditModal from '@/components/EditModal';
import CreatePedidoModal from '@/components/CreatePedidoModal';
import EtiquetaModal from '@/components/EtiquetaModal';

type PainelItem = {
  cliente: string;
  produto: string;
  unidade: 'cx' | 'pct' | 'un' | 'kg';
  congelado: 'Sim' | 'Não';
  observacao: string;
  aProduzir: number;
  produzido: number;
  dataPedido?: string; // Data de produção
  dataFabricacao?: string; // Data de fabricação na etiqueta
  rowId?: number; // Número da linha no Google Sheets
  sourceType?: 'pedido' | 'producao'; // Tipo de origem dos dados
  // Valores individuais para edição
  caixas?: number;
  pacotes?: number;
  unidades?: number;
  kg?: number;
  // Dados de etiqueta
  lote?: number;
  etiquetaGerada?: boolean;
  possuiEtiqueta?: boolean;
  // Dados de foto
  photoUrl?: string;
  photoId?: string;
  photoUploadedAt?: string;
};

type CreatePedidoData = {
  dataPedido: string;
  dataFabricacao: string;
  cliente: string;
  observacao: string;
  itens: {
    produto: string;
    congelado: boolean;
    caixas: number;
    pacotes: number;
    unidades: number;
    kg: number;
  }[];
};

type EditData = {
  dataPedido: string;
  dataFabricacao: string;
  cliente: string;
  observacao: string;
  produto: string;
  congelado: boolean;
  caixas: number;
  pacotes: number;
  unidades: number;
  kg: number;
};

function formatUnidade(u: PainelItem['unidade']): string {
  switch (u) {
    case 'cx': return 'CX';
    case 'pct': return 'PCT';
    case 'un': return 'UN';
    case 'kg': return 'KG';
  }
}


function formatDateManual(dateString: string): string {
  // Extrair dia e mês diretamente da string para evitar problemas de timezone
  // Formato esperado: YYYY-MM-DD
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const [, month, day] = parts;
    return `${day}/${month}`;
  }
  
  // Fallback para outros formatos
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

function formatDateFull(dateString: string): string {
  // Extrair dia, mês e ano diretamente da string para evitar problemas de timezone
  // Formato esperado: YYYY-MM-DD
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  
  // Fallback para outros formatos
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export default function PedidoEmbalagemPage() {
  const [items, setItems] = useState<PainelItem[]>([]);
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
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PainelItem | null>(null);
  const [isNewOrder, setIsNewOrder] = useState(false);
  const [clientesOptions, setClientesOptions] = useState<string[]>([]);
  const [produtosOptions, setProdutosOptions] = useState<string[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [loadingCardId, setLoadingCardId] = useState<string | null>(null);
  
  // Estados para criação
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  
  // Estados para etiqueta
  const [etiquetaModalOpen, setEtiquetaModalOpen] = useState(false);
  const [etiquetaItem, setEtiquetaItem] = useState<PainelItem | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/painel/embalagem?date=${selectedDate}`);
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
    
    // Pausar atualização automática quando modal estiver aberto
    if (!editModalOpen && !createModalOpen && !etiquetaModalOpen) {
      const interval = setInterval(load, 60_000); // atualizar a cada minuto
      return () => clearInterval(interval);
    }
  }, [selectedDate, editModalOpen, createModalOpen, etiquetaModalOpen]);

  // Carregar opções para o modal de edição
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [clientesRes, produtosRes] = await Promise.all([
          fetch('/api/options/embalagem?type=clientes'),
          fetch('/api/options/embalagem?type=produtos'),
        ]);
        const clientesData = await clientesRes.json();
        const produtosData = await produtosRes.json();
        if (clientesRes.ok) setClientesOptions(clientesData.options || []);
        if (produtosRes.ok) setProdutosOptions(produtosData.options || []);
      } catch (_err) {
        // Erro ao carregar opções
      }
    };
    loadOptions();
  }, []);

  // Função para abrir modal de edição
  const handleEditItem = async (item: PainelItem) => {
    if (!item.rowId || item.sourceType !== 'pedido') {
      setMessage('Este item não pode ser editado');
      return;
    }

    try {
      setLoadingCardId(`${item.cliente}-${item.produto}-${item.rowId}`);
      setEditLoading(true);
      const res = await fetch(`/api/embalagem/edit/${item.rowId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar dados para edição');
      
      setEditingItem({
        ...item,
        dataPedido: data.data.dataPedido,
        dataFabricacao: data.data.dataFabricacao,
        cliente: data.data.cliente,
        observacao: data.data.observacao,
        produto: data.data.produto,
        congelado: data.data.congelado ? 'Sim' : 'Não',
        aProduzir: data.data.caixas || data.data.pacotes || data.data.unidades || data.data.kg,
        // Adicionar os valores individuais para o modal
        caixas: data.data.caixas || 0,
        pacotes: data.data.pacotes || 0,
        unidades: data.data.unidades || 0,
        kg: data.data.kg || 0,
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

  // Função para abrir modal de novo pedido
  const handleNewOrder = () => {
    setCreateModalOpen(true);
  };

  // Função para criar novo pedido com múltiplos produtos
  const handleCreatePedido = async (createData: CreatePedidoData) => {
    try {
      setCreateLoading(true);
      setMessage(null);
      
      const res = await fetch('/api/submit/embalagem-pedido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao criar pedido');
      
      setMessage('Pedido criado com sucesso!');
      
      // Recarregar dados do painel
      const painelRes = await fetch(`/api/painel/embalagem?date=${selectedDate}`);
      const painelData = await painelRes.json();
      if (painelRes.ok) {
        setItems((painelData.items || []) as PainelItem[]);
      }
      
      // Limpar mensagem após 3 segundos
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro ao criar pedido');
    } finally {
      setCreateLoading(false);
    }
  };

  // Função para salvar edição ou novo pedido
  const handleSaveEdit = async (editData: EditData) => {
    try {
      setEditLoading(true);
      setMessage(null); // Limpar mensagem anterior
      
      if (isNewOrder) {
        // Criar novo pedido
        const res = await fetch('/api/submit/embalagem-pedido', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dataPedido: editData.dataPedido,
            dataFabricacao: editData.dataFabricacao,
            cliente: editData.cliente,
            observacao: editData.observacao,
            itens: [{
              produto: editData.produto,
              congelado: editData.congelado ? 'Sim' : 'Não',
              caixas: editData.caixas || 0,
              pacotes: editData.pacotes || 0,
              unidades: editData.unidades || 0,
              kg: editData.kg || 0,
            }]
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Falha ao criar novo pedido');
        
        setMessage('Novo pedido criado com sucesso!');
      } else {
        // Editar pedido existente
        if (!editingItem?.rowId) return;
        
        const res = await fetch(`/api/embalagem/edit/${editingItem.rowId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editData),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Falha ao salvar edição');
        
        setMessage('Pedido editado com sucesso!');
      }
      
      // Recarregar dados do painel
      const painelRes = await fetch(`/api/painel/embalagem?date=${selectedDate}`);
      const painelData = await painelRes.json();
      if (painelRes.ok) {
        setItems((painelData.items || []) as PainelItem[]);
      }
      
      // Limpar mensagem após 3 segundos
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setEditLoading(false);
    }
  };

  // Função para deletar pedido
  const handleDeleteOrder = async () => {
    if (!editingItem?.rowId) return;

    try {
      setEditLoading(true);
      setMessage(null); // Limpar mensagem anterior
      
      const res = await fetch(`/api/embalagem/delete/${editingItem.rowId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao deletar pedido');
      
      setMessage('Pedido deletado com sucesso!');
      
      // Recarregar dados do painel
      const painelRes = await fetch(`/api/painel/embalagem?date=${selectedDate}`);
      const painelData = await painelRes.json();
      if (painelRes.ok) {
        setItems((painelData.items || []) as PainelItem[]);
      }
      
      // Limpar mensagem após 3 segundos
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro ao deletar pedido');
    } finally {
      setEditLoading(false);
    }
  };

  // Função para abrir modal de etiqueta
  const handleEtiquetaClick = (item: PainelItem, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!item.lote) {
      setMessage('Este item não possui lote definido');
      return;
    }
    
    setEtiquetaItem(item);
    setEtiquetaModalOpen(true);
  };

  // Função chamada após gerar etiqueta com sucesso
  const handleEtiquetaSuccess = async () => {
    // Recarregar dados do painel para atualizar o status
    try {
      const painelRes = await fetch(`/api/painel/embalagem?date=${selectedDate}`);
      const painelData = await painelRes.json();
      if (painelRes.ok) {
        setItems((painelData.items || []) as PainelItem[]);
      }
      setMessage('Etiqueta gerada com sucesso!');
      setTimeout(() => setMessage(null), 3000);
    } catch (_err) {
      // Erro ao recarregar dados do painel
    }
  };

  // Agrupar itens por cliente/etiqueta/obs para exibição visual
  const groupedItems = useMemo(() => {
    const groups: { [key: string]: PainelItem[] } = {};
    
    items.forEach(item => {
      // Criar chave única baseada em cliente + dataFabricacao + observacao
      const dataFab = item.dataFabricacao || selectedDate;
      const obs = item.observacao?.trim() || '';
      const groupKey = `${item.cliente}|${dataFab}|${obs}`;
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
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
              <span className="text-3xl">📦</span>
              Meta de Embalagem
            </h1>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <button
                onClick={handleNewOrder}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
              >
                + Novo Pedido
              </button>
              
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <label htmlFor="date-filter" className="text-gray-300 text-sm font-medium whitespace-nowrap">
                  Data:
                </label>
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
            message.includes('sucesso') || message.includes('criado') || message.includes('editado') || message.includes('deletado')
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
            {Object.entries(groupedItems).map(([groupKey, groupItems]) => {
              // Extrair informações do grupo da chave
              const [cliente, dataFab, obs] = groupKey.split('|');
              const dataDiferente = dataFab !== selectedDate;
              const observacao = obs || '';
              
              return (
                <div key={groupKey} className="bg-slate-800/20 border border-slate-600/30 rounded-lg p-4 space-y-3 w-full lg:inline-block lg:w-auto">
                  {/* Header do Cliente com Data de Etiqueta e Observação */}
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white">{cliente}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      {dataDiferente && (
                        <div className="text-yellow-300">
                          <span className="font-medium">Etiqueta:</span> {formatDateManual(dataFab)}
                        </div>
                      )}
                      {observacao && (
                        <div className="text-gray-300">
                          Obs: {observacao}
                        </div>
                      )}
                      <div className="text-gray-300">
                        {groupItems.length} produto{groupItems.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                        
                  {/* Cards de Produtos Individuais */}
                  <div className="flex flex-wrap gap-2">
                    {groupItems.map((item, itemIndex) => {
                            const progressoItem = item.aProduzir > 0 ? Math.min((item.produzido / item.aProduzir) * 100, 100) : 0;
                            const itemKey = `${item.cliente}-${item.produto}-${item.rowId}`;
                            const isItemLoading = loadingCardId === itemKey;
                            
                            return (
                              <div 
                                key={`${item.produto}-${itemIndex}`} 
                                className={`p-2.5 rounded-lg cursor-pointer hover:shadow-lg transition-all duration-200 relative w-full sm:w-64 lg:min-w-[350px] flex-shrink-0 ${
                                  item.produzido === 0 ? 'bg-red-900/20 border border-red-500/30' : 'bg-slate-800/40'
                                } ${isItemLoading ? 'opacity-75 pointer-events-none' : ''}`}
                                onClick={() => handleEditItem(item)}
                              >
                                {/* Loading Overlay */}
                                {isItemLoading && (
                                  <div className="absolute inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center rounded-lg">
                                    <div className="flex flex-col items-center space-y-2">
                                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                                      <span className="text-white text-xs font-medium">Carregando...</span>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Header com Nome e Quantidades */}
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-1 flex-1">
                                    <span className="font-semibold text-white text-sm">
                                      {item.produto}
                                      {item.congelado === 'Sim' && (
                                        <span className="material-icons text-blue-300 text-xs ml-1">ac_unit</span>
                                      )}
                                    </span>
                                    {item.photoUrl && (
                                      <a
                                        href={item.photoUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          window.open(item.photoUrl, '_blank');
                                        }}
                                        className="text-white hover:text-gray-300 ml-2 transition-colors cursor-pointer"
                                        title="Ver foto"
                                      >
                                        <span className="material-icons text-lg">photo_camera</span>
                                      </a>
                                    )}
                                    {item.lote && item.possuiEtiqueta && (
                                      <button
                                        onClick={(e) => handleEtiquetaClick(item, e)}
                                        className={`ml-2 transition-colors cursor-pointer ${
                                          item.etiquetaGerada 
                                            ? 'text-green-500 hover:text-green-400' 
                                            : 'text-white hover:text-gray-300'
                                        }`}
                                        title={item.etiquetaGerada ? 'Etiqueta já gerada' : 'Gerar etiqueta'}
                                      >
                                        <span className="material-icons text-lg">label</span>
                                      </button>
                                    )}
                                  </div>
                                  <div className="text-right ml-2 flex-shrink-0">
                                    <div className="text-base font-bold text-white">
                                      {item.produzido} / {item.aProduzir} {formatUnidade(item.unidade)}
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Barra de Progresso do Item */}
                                <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                                  <div 
                                    className={`h-2 rounded-full transition-all duration-300 ${
                                      item.produzido === 0 ? 'bg-red-500 animate-pulse shadow-lg shadow-red-500/50' : 
                                      item.produzido < item.aProduzir ? 'bg-yellow-500' : 
                                      'bg-green-500'
                                    }`}
                                    style={{ width: `${progressoItem}%` }}
                                  ></div>
                                </div>
                              </div>
                            );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <footer className="mt-6 text-center text-gray-400 text-sm">
          {Object.keys(groupedItems).length} grupos • {items.length} itens • {formatDateFull(selectedDate)}
        </footer>
      </div>

      {/* Modal de Edição */}
      <EditModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingItem(null);
          setIsNewOrder(false);
        }}
        onSave={handleSaveEdit}
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
          dataPedido: editingItem.dataPedido || selectedDate,
          dataFabricacao: editingItem.dataFabricacao || selectedDate,
          cliente: editingItem.cliente,
          observacao: editingItem.observacao,
          produto: editingItem.produto,
          congelado: editingItem.congelado === 'Sim',
          caixas: editingItem.caixas || 0,
          pacotes: editingItem.pacotes || 0,
          unidades: editingItem.unidades || 0,
          kg: editingItem.kg || 0,
        } : undefined}
        clientesOptions={clientesOptions}
        produtosOptions={produtosOptions}
        loading={editLoading}
      />

      {/* Modal de Criação de Pedido */}
      <CreatePedidoModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={handleCreatePedido}
        clientesOptions={clientesOptions}
        produtosOptions={produtosOptions}
        loading={createLoading}
      />

      {/* Modal de Etiqueta */}
      {etiquetaItem && (
        <EtiquetaModal
          isOpen={etiquetaModalOpen}
          onClose={() => {
            setEtiquetaModalOpen(false);
            setEtiquetaItem(null);
          }}
          produto={etiquetaItem.produto}
          dataFabricacao={etiquetaItem.dataFabricacao || selectedDate}
          congeladoInicial={etiquetaItem.congelado === 'Sim'}
          cliente={etiquetaItem.cliente}
          lote={etiquetaItem.lote || 0}
          rowId={etiquetaItem.rowId}
          onSuccess={handleEtiquetaSuccess}
        />
      )}
    </div>
  );
}
