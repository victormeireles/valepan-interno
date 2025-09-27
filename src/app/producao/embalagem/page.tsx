'use client';

import { useEffect, useMemo, useState } from 'react';
import ProducaoModal from '@/components/ProducaoModal';

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
  // Dados do pedido original para exibição
  pedidoCaixas?: number;
  pedidoPacotes?: number;
  pedidoUnidades?: number;
  pedidoKg?: number;
  // Dados de fotos (novos campos)
  pacoteFotoUrl?: string;
  pacoteFotoId?: string;
  pacoteFotoUploadedAt?: string;
  etiquetaFotoUrl?: string;
  etiquetaFotoId?: string;
  etiquetaFotoUploadedAt?: string;
  palletFotoUrl?: string;
  palletFotoId?: string;
  palletFotoUploadedAt?: string;
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

export default function ProducaoEmbalagemPage() {
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
  
  // Estados para edição de produção
  const [producaoModalOpen, setProducaoModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PainelItem | null>(null);
  const [producaoLoading, setProducaoLoading] = useState(false);
  const [loadingCardId, setLoadingCardId] = useState<string | null>(null);

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
    if (!producaoModalOpen) {
      const interval = setInterval(load, 60_000); // atualizar a cada minuto
      return () => clearInterval(interval);
    }
  }, [selectedDate, producaoModalOpen]);

  // Fechar dropdowns ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.photo-dropdown') && !target.closest('button[title="Ver fotos"]')) {
        document.querySelectorAll('.photo-dropdown').forEach(dropdown => {
          dropdown.classList.add('hidden');
        });
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);


  // Função para abrir modal de edição de produção
  const handleEditProducao = async (item: PainelItem) => {
    if (!item.rowId) {
      setMessage('Este item não pode ser editado');
      return;
    }

    try {
      setLoadingCardId(`${item.cliente}-${item.produto}-${item.rowId}`);
      setProducaoLoading(true);
      const res = await fetch(`/api/producao/embalagem/${item.rowId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar dados de produção');
      
      setEditingItem({
        ...item,
        caixas: data.data.caixas || 0,
        pacotes: data.data.pacotes || 0,
        unidades: data.data.unidades || 0,
        kg: data.data.kg || 0,
        // Dados do pedido original para exibição
        pedidoCaixas: data.data.pedidoCaixas || 0,
        pedidoPacotes: data.data.pedidoPacotes || 0,
        pedidoUnidades: data.data.pedidoUnidades || 0,
        pedidoKg: data.data.pedidoKg || 0,
        // Dados de fotos (novos campos)
        pacoteFotoUrl: data.data.pacoteFotoUrl,
        pacoteFotoId: data.data.pacoteFotoId,
        pacoteFotoUploadedAt: data.data.pacoteFotoUploadedAt,
        etiquetaFotoUrl: data.data.etiquetaFotoUrl,
        etiquetaFotoId: data.data.etiquetaFotoId,
        etiquetaFotoUploadedAt: data.data.etiquetaFotoUploadedAt,
        palletFotoUrl: data.data.palletFotoUrl,
        palletFotoId: data.data.palletFotoId,
        palletFotoUploadedAt: data.data.palletFotoUploadedAt,
      });
      setProducaoModalOpen(true);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro ao carregar dados de produção');
    } finally {
      setProducaoLoading(false);
      setLoadingCardId(null);
    }
  };

  // Função para recarregar dados do painel
  const refreshPainelData = async () => {
    try {
      const painelRes = await fetch(`/api/painel/embalagem?date=${selectedDate}`);
      const painelData = await painelRes.json();
      if (painelRes.ok) {
        setItems((painelData.items || []) as PainelItem[]);
      }
    } catch (err) {
      console.error('Erro ao recarregar dados do painel:', err);
    }
  };

  // Função para salvar produção
  const handleSaveProducao = async (producaoData: { caixas: number; pacotes: number; unidades: number; kg: number }) => {
    if (!editingItem?.rowId) return;

    try {
      setProducaoLoading(true);
      setMessage(null);
      
      const res = await fetch(`/api/producao/embalagem/${editingItem.rowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(producaoData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar produção');
      
      // Fechar modal imediatamente
      setEditingItem(null);
      setProducaoLoading(false);
      
      setMessage('Produção atualizada com sucesso!');
      
      // Recarregar dados do painel
      await refreshPainelData();
      
      // Limpar mensagem após 3 segundos
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro ao salvar produção');
      setProducaoLoading(false);
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
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="mx-auto">
        <header className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">Produção de Embalagem</h1>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
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
          <div className="space-y-4">
            {Object.entries(groupedItems).map(([groupKey, groupItems]) => {
              // Extrair informações do grupo da chave
              const [cliente, dataFab, obs] = groupKey.split('|');
              const dataDiferente = dataFab !== selectedDate;
              const observacao = obs || '';
              
              return (
                <div key={groupKey} className="space-y-2">
                  {/* Header do Cliente com Data de Etiqueta e Observação */}
                  <div className="flex items-center gap-4">
                    <h3 className="text-2xl font-bold text-white">{cliente}</h3>
                    {dataDiferente && (
                      <div className="text-sm text-yellow-300">
                        <span className="font-medium">Etiqueta:</span> {formatDateManual(dataFab)}
                      </div>
                    )}
                    {observacao && (
                      <div className="text-sm text-gray-300">
                        Obs: {observacao}
                      </div>
                    )}
                    <div className="text-sm text-gray-300">
                      {groupItems.length} produto{groupItems.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                        
                  {/* Cards de Produtos Individuais */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2">
                    {groupItems.map((item, itemIndex) => {
                            const progressoItem = item.aProduzir > 0 ? Math.min((item.produzido / item.aProduzir) * 100, 100) : 0;
                            const itemKey = `${item.cliente}-${item.produto}-${item.rowId}`;
                            const isItemLoading = loadingCardId === itemKey;
                            
                            return (
                              <div 
                                key={`${item.produto}-${itemIndex}`} 
                                className={`p-2.5 rounded-lg cursor-pointer hover:shadow-lg transition-all duration-200 relative ${
                                  item.produzido === 0 ? 'bg-red-900/20 border border-red-500/30' : 'bg-gray-800/40'
                                } ${isItemLoading ? 'opacity-75 pointer-events-none' : ''}`}
                                onClick={() => handleEditProducao(item)}
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
                                    {(item.pacoteFotoUrl || item.etiquetaFotoUrl || item.palletFotoUrl) && (
                                      <div className="relative ml-2">
                                        <button
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            
                                            // Fechar todos os outros dropdowns
                                            document.querySelectorAll('.photo-dropdown').forEach(dropdown => {
                                              dropdown.classList.add('hidden');
                                            });
                                            
                                            // Abrir/fechar o dropdown atual
                                            const dropdown = e.currentTarget.nextElementSibling as HTMLElement;
                                            dropdown.classList.toggle('hidden');
                                          }}
                                          className="text-white hover:text-gray-300 transition-colors cursor-pointer"
                                          title="Ver fotos"
                                        >
                                          <span className="material-icons text-lg">photo_camera</span>
                                        </button>
                                        
                                        {/* Dropdown de fotos */}
                                        <div className="photo-dropdown absolute left-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 hidden min-w-[200px]">
                                          {item.pacoteFotoUrl && (
                                            <a
                                              href={item.pacoteFotoUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                window.open(item.pacoteFotoUrl, '_blank');
                                                // Fechar dropdown
                                                const dropdown = e.currentTarget.closest('.photo-dropdown') as HTMLElement;
                                                dropdown.classList.add('hidden');
                                              }}
                                              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                                            >
                                              <span className="text-sm">📦</span>
                                              <span className="text-sm">Foto do Pacote</span>
                                            </a>
                                          )}
                                          {item.etiquetaFotoUrl && (
                                            <a
                                              href={item.etiquetaFotoUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                window.open(item.etiquetaFotoUrl, '_blank');
                                                // Fechar dropdown
                                                const dropdown = e.currentTarget.closest('.photo-dropdown') as HTMLElement;
                                                dropdown.classList.add('hidden');
                                              }}
                                              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                                            >
                                              <span className="text-sm">🏷️</span>
                                              <span className="text-sm">Foto da Etiqueta</span>
                                            </a>
                                          )}
                                          {item.palletFotoUrl && (
                                            <a
                                              href={item.palletFotoUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                window.open(item.palletFotoUrl, '_blank');
                                                // Fechar dropdown
                                                const dropdown = e.currentTarget.closest('.photo-dropdown') as HTMLElement;
                                                dropdown.classList.add('hidden');
                                              }}
                                              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                                            >
                                              <span className="text-sm">🚛</span>
                                              <span className="text-sm">Foto do Pallet</span>
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-right ml-2 flex-shrink-0">
                                    <div className="text-base font-bold text-white">
                                      {item.produzido} / {item.aProduzir} {formatUnidade(item.unidade)}
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Barra de Progresso do Item */}
                                <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
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

      {/* Modal de Edição de Produção */}
      <ProducaoModal
        isOpen={producaoModalOpen}
        onClose={() => {
          setProducaoModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveProducao}
        onSaveSuccess={refreshPainelData}
        initialData={editingItem ? {
          caixas: editingItem.caixas || 0,
          pacotes: editingItem.pacotes || 0,
          unidades: editingItem.unidades || 0,
          kg: editingItem.kg || 0,
          pacoteFotoUrl: editingItem.pacoteFotoUrl,
          pacoteFotoId: editingItem.pacoteFotoId,
          pacoteFotoUploadedAt: editingItem.pacoteFotoUploadedAt,
          etiquetaFotoUrl: editingItem.etiquetaFotoUrl,
          etiquetaFotoId: editingItem.etiquetaFotoId,
          etiquetaFotoUploadedAt: editingItem.etiquetaFotoUploadedAt,
          palletFotoUrl: editingItem.palletFotoUrl,
          palletFotoId: editingItem.palletFotoId,
          palletFotoUploadedAt: editingItem.palletFotoUploadedAt,
        } : undefined}
        produto={editingItem?.produto || ''}
        cliente={editingItem?.cliente || ''}
        rowId={editingItem?.rowId}
        pedidoQuantidades={editingItem ? {
          caixas: editingItem.pedidoCaixas || 0,
          pacotes: editingItem.pedidoPacotes || 0,
          unidades: editingItem.pedidoUnidades || 0,
          kg: editingItem.pedidoKg || 0,
        } : undefined}
        loading={producaoLoading}
      />
    </div>
  );
}
