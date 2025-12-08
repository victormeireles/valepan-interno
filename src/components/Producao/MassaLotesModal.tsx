'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getMassaLotesByOrder } from '@/app/actions/producao-massa-actions';
import { getMasseiras } from '@/app/actions/producao-etapas-actions';
import { MassaLote } from '@/domain/types/producao-massa';

interface MassaLotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  ordemProducaoId: string;
  produtoNome: string;
  loteCodigo: string;
}

interface Masseira {
  id: string;
  nome: string;
}

// Função para converter decimal para minutos e segundos
const decimalParaMinutosSegundos = (decimal: number): { minutos: number; segundos: number } => {
  const minutos = Math.floor(decimal);
  const segundos = Math.round((decimal - minutos) * 60);
  return { minutos, segundos };
};

export default function MassaLotesModal({
  isOpen,
  onClose,
  ordemProducaoId,
  produtoNome,
  loteCodigo,
}: MassaLotesModalProps) {
  const router = useRouter();
  const [lotes, setLotes] = useState<MassaLote[]>([]);
  const [masseiras, setMasseiras] = useState<Masseira[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, ordemProducaoId]);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('[MassaLotesModal] Carregando lotes para ordem:', ordemProducaoId);
      const [lotesResult, masseirasResult] = await Promise.all([
        getMassaLotesByOrder(ordemProducaoId),
        getMasseiras(),
      ]);

      console.log('[MassaLotesModal] Resultado da busca de lotes:', {
        success: lotesResult.success,
        dataLength: lotesResult.data?.length || 0,
        data: lotesResult.data,
        error: lotesResult.error,
      });

      if (lotesResult.success && lotesResult.data) {
        setLotes(lotesResult.data);
        console.log('[MassaLotesModal] Lotes definidos:', lotesResult.data.length);
      } else {
        console.error('[MassaLotesModal] Erro ao buscar lotes:', lotesResult.error);
        setLotes([]);
      }

      if (masseirasResult.success && masseirasResult.data) {
        setMasseiras(masseirasResult.data);
      }
    } catch (error) {
      console.error('[MassaLotesModal] Erro ao carregar dados:', error);
      setLotes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEditLote = (loteId: string) => {
    router.push(`/producao/etapas/${ordemProducaoId}/massa?loteId=${loteId}`);
    onClose();
  };

  const handleNewLote = () => {
    router.push(`/producao/etapas/${ordemProducaoId}/massa`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Gerenciar Lotes de Massa</h2>
            <p className="text-sm text-gray-600 mt-1">
              {loteCodigo} - {produtoNome}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span className="material-icons text-xl">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Lista de Lotes */}
              {lotes.length > 0 ? (
                <div className="space-y-3 mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Lotes Produzidos ({lotes.length})
                  </h3>
                  {lotes.map((lote) => {
                    const tempoLenta = lote.tempo_lenta ? decimalParaMinutosSegundos(lote.tempo_lenta) : null;
                    const tempoRapida = lote.tempo_rapida ? decimalParaMinutosSegundos(lote.tempo_rapida) : null;
                    const masseira = lote.masseira_id ? masseiras.find((m) => m.id === lote.masseira_id) : null;

                    return (
                      <div
                        key={lote.id}
                        className="p-4 bg-gray-50 border-2 border-gray-200 rounded-xl hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <p className="font-semibold text-gray-900">
                                {lote.receitas_batidas} receita{lote.receitas_batidas !== 1 ? 's' : ''}
                              </p>
                              <span className="text-xs text-gray-500">
                                {new Date(lote.created_at).toLocaleString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <div className="space-y-1 text-sm text-gray-600">
                              {masseira && (
                                <p>
                                  <span className="font-medium">Masseira:</span> {masseira.nome}
                                </p>
                              )}
                              {lote.temperatura_final && (
                                <p>
                                  <span className="font-medium">Temperatura:</span> {lote.temperatura_final}°C
                                </p>
                              )}
                              {tempoLenta && (
                                <p>
                                  <span className="font-medium">Lenta:</span> {tempoLenta.minutos}min{' '}
                                  {tempoLenta.segundos.toString().padStart(2, '0')}seg
                                </p>
                              )}
                              {tempoRapida && (
                                <p>
                                  <span className="font-medium">Rápida:</span> {tempoRapida.minutos}min{' '}
                                  {tempoRapida.segundos.toString().padStart(2, '0')}seg
                                </p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleEditLote(lote.id)}
                            className="ml-4 px-4 py-2 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-lg font-medium hover:bg-blue-100 transition-all"
                          >
                            Editar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 mb-6">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="material-icons text-3xl text-gray-400">inventory_2</span>
                  </div>
                  <p className="text-gray-600">Nenhum lote produzido ainda</p>
                  <p className="text-sm text-gray-500 mt-1">Crie o primeiro lote para começar</p>
                </div>
              )}

              {/* Botão Criar Novo Lote */}
              <button
                onClick={handleNewLote}
                className="w-full px-6 py-3.5 text-white bg-gray-900 rounded-xl font-semibold shadow-lg shadow-gray-900/20 hover:bg-black hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-icons text-sm">add</span>
                <span>{lotes.length === 0 ? 'Criar Primeiro Lote' : 'Criar Novo Lote'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

