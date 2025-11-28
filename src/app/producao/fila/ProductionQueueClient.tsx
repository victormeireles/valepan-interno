'use client';

import { useState } from 'react';
import NovaOrdemModal from '@/components/Producao/NovaOrdemModal';
import DashboardHeader from '@/components/DashboardHeader';
import { ProductionQueueItem } from '@/domain/types/producao';

interface ProductionQueueClientProps {
  initialQueue: ProductionQueueItem[];
}

export default function ProductionQueueClient({ initialQueue }: ProductionQueueClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Stats Calculation
  const totalOrders = initialQueue.length;
  const urgentOrders = initialQueue.filter(i => i.prioridade === 2).length;
  const plannedOrders = initialQueue.filter(i => i.status === 'planejado').length;

  const getPriorityStyles = (p: number) => {
    if (p === 2) return {
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
      dot: 'bg-rose-500',
      label: 'URGENTE'
    };
    if (p === 1) return {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      dot: 'bg-amber-500',
      label: 'ALTA'
    };
    return {
      bg: 'bg-slate-50',
      text: 'text-slate-600',
      border: 'border-slate-200',
      dot: 'bg-slate-400',
      label: 'NORMAL'
    };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit' 
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <DashboardHeader 
        title="Fila de Produção" 
        icon="📋"
      />

      <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
        
        {/* Stats Grid & Action Button */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-stretch">
          {/* Action Button - Mobile First (Top) or Desktop (Right) */}
          <div className="w-full md:w-auto md:order-2">
             <button
              onClick={() => setIsModalOpen(true)}
              className="w-full md:w-auto group relative inline-flex items-center justify-center px-6 py-4 text-sm font-medium text-white transition-all duration-200 bg-gray-900 rounded-2xl shadow-lg hover:bg-gray-800 hover:shadow-xl hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 h-full"
            >
              <span className="mr-2 text-lg leading-none">+</span> Nova Ordem
              <div className="absolute inset-0 rounded-2xl ring-2 ring-white/20 group-hover:ring-white/40 transition-all" />
            </button>
          </div>

          {/* Stats - Grid */}
          <div className="grid grid-cols-3 gap-4 flex-1 w-full md:order-1">
            <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Total</p>
              <p className="text-2xl md:text-3xl font-bold text-gray-900">{totalOrders}</p>
            </div>
            <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
              <p className="text-xs font-medium text-rose-600 uppercase tracking-wide mb-1">Urgentes</p>
              <p className="text-2xl md:text-3xl font-bold text-rose-600">{urgentOrders}</p>
            </div>
            <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
              <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide mb-1">Planejados</p>
              <p className="text-2xl md:text-3xl font-bold text-emerald-600">{plannedOrders}</p>
            </div>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 gap-4">
          {initialQueue.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <span className="material-icons text-3xl text-gray-300">inbox</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Fila vazia</h3>
              <p className="text-gray-500 max-w-sm text-center mt-1">Não há ordens de produção pendentes no momento. Crie uma nova ordem para começar.</p>
            </div>
          ) : (
            initialQueue.map((item) => {
              const priorityStyle = getPriorityStyles(item.prioridade);
              return (
                <div
                  key={item.id}
                  className="group bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200 relative overflow-hidden"
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${priorityStyle.bg.replace('bg-', 'bg-').replace('50', '500')}`} />
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pl-4">
                    {/* Left Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-gray-400 tracking-wider">{item.lote_codigo}</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${priorityStyle.dot}`} />
                          {priorityStyle.label}
                        </span>
                        <span className="text-xs font-medium text-gray-400 flex items-center gap-1">
                          <span className="material-icons text-[10px]">schedule</span>
                          {formatDate(item.created_at)}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {item.produtos.nome}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                          <span className="font-medium text-gray-900">{item.qtd_planejada}</span>
                          <span className="text-gray-400">{item.produtos.unidade}</span>
                          
                          {item.pedidos?.clientes?.nome_fantasia && (
                            <>
                              <span className="text-gray-300">•</span>
                              <span className="flex items-center gap-1 text-gray-500 bg-gray-50 px-2 py-0.5 rounded-md">
                                <span className="material-icons text-xs">person</span>
                                {item.pedidos.clientes.nome_fantasia}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Action */}
                    <div className="flex items-center justify-end">
                      <button className="w-full sm:w-auto px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium shadow-sm hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900 transition-all active:scale-95 flex items-center justify-center gap-2">
                        <span className="material-icons text-gray-400 group-hover:text-green-600 transition-colors">play_circle</span>
                        Iniciar Produção
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <NovaOrdemModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
