'use client';

import { useEffect, useMemo, useState } from 'react';

type PainelItem = {
  cliente: string;
  produto: string;
  unidade: 'cx' | 'pct' | 'un' | 'kg';
  congelado: 'Sim' | 'Não';
  observacao: string;
  aProduzir: number;
  produzido: number;
  dataFabricacao?: string;
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
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

export default function PainelEmbalagemPage() {
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
    const interval = setInterval(load, 60_000); // atualizar a cada minuto
    return () => clearInterval(interval);
  }, [selectedDate]);

  // Agrupar itens por cliente, observação e data de fabricação
  const groupedItems = useMemo(() => {
    const groups: { [key: string]: PainelItem[] } = {};
    
    items.forEach(item => {
      const observacao = item.observacao || 'Sem observação';
      const dataFab = item.dataFabricacao || selectedDate;
      const groupKey = `${item.cliente}|||${observacao}|||${dataFab}`;
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
    });
    
    return groups;
  }, [items, selectedDate]);

  // Cor única elegante para todos os grupos
  const groupColor = 'bg-gray-800/40 border-gray-600/50';

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="mx-auto">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-extrabold tracking-tight">Painel de Produção - Embalagem</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="date-filter" className="text-gray-300 text-sm font-medium">
                Data:
              </label>
              <input
                id="date-filter"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="text-gray-300 text-sm">Atualiza automaticamente</div>
          </div>
        </header>

        {message && (
          <div className="mb-4 p-4 rounded-md bg-red-800/30 border border-red-600 text-red-100">
            {message}
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-gray-400 text-xl">Carregando...</div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedItems).map(([groupKey, groupItems]) => {
              const [cliente, observacao, dataFab] = groupKey.split('|||');
              const dataProducaoISO = selectedDate;
              const dataDiferente = dataFab && dataFab !== dataProducaoISO;
              
              return (
                <div key={groupKey} className={`rounded-xl border-2 p-4 ${groupColor} shadow-lg h-fit`}>
                  {/* Header do Grupo */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-4 flex-1">
                        <h3 className="text-xl font-bold text-white">{cliente}</h3>
                        
                        {observacao !== 'Sem observação' && (
                          <div className="text-sm text-gray-300">
                            <span className="font-medium">Obs:</span> {observacao}
                          </div>
                        )}
                        
                        {dataDiferente && (
                          <div className="text-sm text-yellow-300">
                            <span className="font-medium">Etiqueta:</span> {formatDateManual(dataFab)}
                          </div>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-300">
                        {groupItems.length} iten{groupItems.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  
                  {/* Lista de Produtos */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2">
                    {groupItems.map((item, itemIndex) => {
                      const showCongelado = item.congelado === 'Sim';
                      const progressoItem = item.aProduzir > 0 ? (item.produzido / item.aProduzir) * 100 : 0;
                      
                      return (
                        <div key={itemIndex} className={`p-2.5 rounded-lg ${
                          item.produzido === 0 ? 'bg-red-900/20 border border-red-500/30' : 'bg-gray-800/40'
                        }`}>
                          {/* Header com Nome e Quantidades */}
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-1 flex-1">
                              <span className="font-semibold text-white text-sm">
                                {item.produto}
                                {showCongelado && (
                                  <span className="material-icons text-blue-300 text-xs ml-1">ac_unit</span>
                                )}
                              </span>
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
          {Object.keys(groupedItems).length} grupos • {items.length} itens • {new Date(selectedDate).toLocaleDateString('pt-BR')}
        </footer>
      </div>
    </div>
  );
}


