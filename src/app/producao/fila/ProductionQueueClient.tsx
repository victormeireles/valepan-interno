'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import NovaOrdemModal from '@/components/Producao/NovaOrdemModal';
import DashboardHeader from '@/components/DashboardHeader';
import ProductionProgressBar from '@/components/Producao/ProductionProgressBar';
import MassaLotesModal from '@/components/Producao/MassaLotesModal';
import { getQuantityByStation, Station } from '@/lib/utils/production-conversions';

interface QueueItem {
  id: string;
  lote_codigo: string;
  produto_id: string;
  qtd_planejada: number;
  status?: string | null;
  prioridade?: number | null;
  created_at?: string | null;
  data_producao?: string | null;
  receitas_batidas?: number;
  receitas_fermentacao?: number;
  qtd_massa_finalizada?: number | null;
  produtos: {
    nome: string;
    unidadeNomeResumido: string | null; // nome_resumido da tabela unidades
    package_units?: number | null;
    box_units?: number | null;
    unidades_assadeira?: number | null;
    receita_massa?: {
      quantidade_por_produto: number;
    } | null;
  };
  pedidos?: {
    cliente_id: string;
    clientes?: {
      nome_fantasia: string;
    };
  } | null;
}

interface ProductionQueueClientProps {
  initialQueue: QueueItem[];
  station?: string;
}

export default function ProductionQueueClient({
  initialQueue,
  station = 'planejamento',
}: ProductionQueueClientProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<QueueItem | undefined>(undefined);
  const [isMassaLotesModalOpen, setIsMassaLotesModalOpen] = useState(false);
  const [selectedMassaOrder, setSelectedMassaOrder] = useState<QueueItem | undefined>(undefined);

  const effectiveStation = useMemo<Station>(() => {
    const allowed: Station[] = ['planejamento', 'massa', 'fermentacao', 'forno', 'embalagem'];
    return allowed.includes(station as Station) ? (station as Station) : 'planejamento';
  }, [station]);

  const isPlanning = effectiveStation === 'planejamento';
  const isMassa = effectiveStation === 'massa';
  const isFermentacao = effectiveStation === 'fermentacao';

  // Função para obter título e ícone da estação
  const getStationInfo = (station: Station) => {
    const stationMap: Record<Station, { nome: string; icon: string }> = {
      planejamento: { nome: 'Planejamento', icon: 'schedule' },
      massa: { nome: 'Massa', icon: 'blender' },
      fermentacao: { nome: 'Fermentação', icon: 'eco' },
      forno: { nome: 'Forno', icon: 'local_fire_department' },
      embalagem: { nome: 'Embalagem', icon: 'inventory_2' },
    };
    return stationMap[station];
  };

  const stationInfo = getStationInfo(effectiveStation);

  // Filtrar fila para fermentação: mostrar apenas itens com massa finalizada > 0
  const filteredQueue = useMemo(() => {
    if (isFermentacao) {
      return initialQueue.filter((item) => {
        const qtdMassaFinalizada = item.qtd_massa_finalizada ?? 0;
        return qtdMassaFinalizada > 0;
      });
    }
    return initialQueue;
  }, [initialQueue, isFermentacao]);

  // Stats Calculation
  const totalOrders = filteredQueue.length;
  const urgentOrders = filteredQueue.filter(i => i.prioridade === 2).length;
  const plannedOrders = filteredQueue.filter(i => i.status === 'planejado').length;

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


  const formatDay = (dateString?: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <DashboardHeader 
        title={`Produção - ${stationInfo.nome}`}
        icon={stationInfo.icon}
      />

      <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
        
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-stretch">
          <div className="grid grid-cols-3 gap-4 flex-1 w-full order-1">
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

          {isPlanning && (
            <div className="w-full md:w-auto order-2">
              <button
                onClick={() => {
                  setEditingOrder(undefined);
                  setIsModalOpen(true);
                }}
                className="w-full md:w-auto group relative inline-flex items-center justify-center px-6 py-4 text-sm font-medium text-white transition-all duration-200 bg-gray-900 rounded-2xl shadow-lg hover:bg-gray-800 hover:shadow-xl hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 h-full"
              >
                <span className="mr-2 text-lg leading-none">+</span> Nova Ordem
                <div className="absolute inset-0 rounded-2xl ring-2 ring-white/20 group-hover:ring-white/40 transition-all pointer-events-none" />
              </button>
            </div>
          )}
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 gap-4">
          {filteredQueue.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <span className="material-icons text-3xl text-gray-300">inbox</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Fila vazia</h3>
              <p className="text-gray-500 max-w-sm text-center mt-1">
                {isFermentacao 
                  ? 'Não há ordens de produção com massa finalizada no momento.'
                  : 'Não há ordens de produção pendentes no momento. Crie uma nova ordem para começar.'}
              </p>
            </div>
          ) : (
            filteredQueue.map((item) => {
              console.log(`\n🔍 [FILA] Processando item:`, {
                produto: item.produtos.nome,
                lote: item.lote_codigo,
                qtd_planejada: item.qtd_planejada,
                qtd_massa_finalizada: item.qtd_massa_finalizada,
                estacao: effectiveStation,
                produto_dados: {
                  unidadeNomeResumido: item.produtos.unidadeNomeResumido,
                  box_units: item.produtos.box_units,
                  package_units: item.produtos.package_units,
                  unidades_assadeira: item.produtos.unidades_assadeira,
                  receita_massa: item.produtos.receita_massa,
                },
              });
              
              const priorityStyle = getPriorityStyles(item.prioridade ?? 0);
              
              // Para fermentação, usar quantidade finalizada de massa convertida para unidades
              let quantidadeParaCalculo = item.qtd_planejada;
              if (isFermentacao && item.qtd_massa_finalizada && item.qtd_massa_finalizada > 0) {
                // Converter receitas finalizadas de massa para unidades
                const receitasMassaFinalizadas = item.qtd_massa_finalizada;
                const quantidadePorProduto = item.produtos.receita_massa?.quantidade_por_produto;
                if (quantidadePorProduto && quantidadePorProduto > 0) {
                  // Receitas × quantidade_por_produto = unidades
                  const unidadesConvertidas = receitasMassaFinalizadas * quantidadePorProduto;
                  quantidadeParaCalculo = unidadesConvertidas;
                }
              }
              
              const quantityInfo = getQuantityByStation(effectiveStation, quantidadeParaCalculo, item.produtos);
              const productionDate = formatDay(item.data_producao);
              const disableMassaAction = isMassa && quantityInfo.hasWarning;
              
              // Calcular progresso de receitas (apenas para estação massa)
              const receitasNecessarias = quantityInfo.receitas?.value || 0;
              const receitasBatidas = item.receitas_batidas || 0;
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const progressoReceitas = receitasNecessarias > 0 
                ? Math.min(100, (receitasBatidas / receitasNecessarias) * 100) 
                : 0;
              
              console.log(`✅ [FILA] Resultado para ${item.produtos.nome}:`, quantityInfo);

              return (
                <div
                  key={item.id}
                  className="group bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200 relative overflow-hidden"
                >
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1.5 ${priorityStyle.bg.replace('bg-', 'bg-').replace('50', '500')}`}
                  />

                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pl-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-wide">
                          <span className="font-mono text-gray-400">{item.lote_codigo}</span>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-semibold border ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${priorityStyle.dot}`} />
                            {priorityStyle.label}
                          </span>
                          {productionDate && (
                            <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-medium">
                              {productionDate}
                            </span>
                          )}
                        </div>
                        {isMassa && (
                          <button
                            onClick={() => {
                              setSelectedMassaOrder(item);
                              setIsMassaLotesModalOpen(true);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium shadow-sm flex items-center gap-1.5 whitespace-nowrap transition-all ${
                              disableMassaAction
                                ? 'bg-gray-50 border border-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900 active:scale-95'
                            }`}
                            disabled={disableMassaAction}
                          >
                            <span className="material-icons text-base">play_circle</span>
                            <span>Iniciar</span>
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {item.produtos.nome}
                          </h3>
                          <span className="text-gray-300 hidden sm:inline">•</span>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                            {isPlanning ? (
                              // Modo planejamento: mostra caixas / receitas / assadeiras
                              <>
                                <span className="font-semibold text-gray-900">{quantityInfo.readable}</span>
                                {quantityInfo.receitas && (
                                  <>
                                    <span className="text-gray-300">/</span>
                                    <span className={`font-semibold ${quantityInfo.receitas.hasWarning ? 'text-amber-600' : 'text-blue-600'}`}>
                                      {quantityInfo.receitas.readable}
                                    </span>
                                  </>
                                )}
                                {quantityInfo.assadeiras && (
                                  <>
                                    <span className="text-gray-300">/</span>
                                    <span className="font-semibold text-emerald-600">{quantityInfo.assadeiras.readable}</span>
                                  </>
                                )}
                              </>
                            ) : isMassa ? (
                              // Modo massa: mostra receitas / assadeiras / unidades
                              <>
                                {quantityInfo.receitas && (
                                  <span className={`font-semibold ${quantityInfo.receitas.hasWarning ? 'text-amber-600' : 'text-blue-600'}`}>
                                    {quantityInfo.receitas.readable}
                                  </span>
                                )}
                                {quantityInfo.assadeiras && (
                                  <>
                                    <span className="text-gray-300">/</span>
                                    <span className="font-semibold text-emerald-600">{quantityInfo.assadeiras.readable}</span>
                                  </>
                                )}
                                {quantityInfo.unidades && (
                                  <>
                                    <span className="text-gray-300">/</span>
                                    <span className="font-semibold text-gray-700">{quantityInfo.unidades.readable}</span>
                                  </>
                                )}
                              </>
                            ) : (
                              // Outras estações: mostra apenas a quantidade principal
                              <span className="font-semibold text-gray-900">{quantityInfo.readable}</span>
                            )}
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

                        {/* Barra de progresso de receitas (para estação massa e fermentação) */}
                        {(isMassa || isFermentacao) && receitasNecessarias > 0 && (
                          <div className="w-full">
                            <ProductionProgressBar
                              receitasOP={receitasNecessarias}
                              receitasMassa={receitasBatidas}
                              receitasFermentacao={isFermentacao ? (item.receitas_fermentacao || 0) : undefined}
                            />
                          </div>
                        )}

                        {/* Avisos gerais (para massa e planejamento) */}
                        {quantityInfo.hasWarning && (
                          <div className="w-full flex items-start gap-2 text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl">
                            <span className="material-icons text-base">warning</span>
                            <span className="text-sm leading-snug">
                              {quantityInfo.warningMessage || 'Receita obrigatória não configurada para este produto.'}
                            </span>
                          </div>
                        )}

                        {/* Avisos específicos do planejamento */}
                        {isPlanning && quantityInfo.receitas?.hasWarning && (
                          <div className="w-full flex items-start gap-2 text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl">
                            <span className="material-icons text-base">info</span>
                            <span className="text-sm leading-snug">
                              Este produto não possui receita de massa vinculada.
                            </span>
                          </div>
                        )}

                        {isPlanning && (
                          <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                            <button
                              onClick={() => {
                                setEditingOrder(item);
                                setIsModalOpen(true);
                              }}
                              className="flex-1 sm:flex-none px-4 py-2 border border-gray-200 text-gray-700 rounded-xl font-medium shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                              <span className="material-icons text-gray-400">edit</span>
                              <span className="sm:hidden">Editar</span>
                            </button>
                          </div>
                        )}
                        {isFermentacao && (
                          <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                            <button
                              onClick={() => router.push(`/producao/etapas/${item.id}/fermentacao`)}
                              className="flex-1 sm:flex-none px-4 py-2 rounded-xl font-medium shadow-sm flex items-center justify-center gap-2 whitespace-nowrap bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900 transition-all active:scale-95"
                            >
                              <span className="material-icons text-base">play_circle</span>
                              <span>Iniciar</span>
                            </button>
                          </div>
                        )}
                        {!isPlanning && !isMassa && !isFermentacao && (
                          <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                            <button className="flex-1 sm:flex-none px-4 py-2 bg-white border border-gray-100 text-gray-600 rounded-xl font-medium shadow-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-2 whitespace-nowrap">
                              <span className="material-icons text-gray-400">visibility</span>
                              Detalhes
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <NovaOrdemModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingOrder(undefined);
        }}
        order={editingOrder}
        onSaved={() => {
          setIsModalOpen(false);
          setEditingOrder(undefined);
          router.refresh();
        }}
      />

      {selectedMassaOrder && (
        <MassaLotesModal
          isOpen={isMassaLotesModalOpen}
          onClose={() => {
            setIsMassaLotesModalOpen(false);
            setSelectedMassaOrder(undefined);
          }}
          ordemProducaoId={selectedMassaOrder.id}
          produtoNome={selectedMassaOrder.produtos.nome}
          loteCodigo={selectedMassaOrder.lote_codigo}
        />
      )}
    </div>
  );
}
