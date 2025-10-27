'use client';

import { useEffect, useMemo, useState } from 'react';
import ProducaoModal from '@/components/ProducaoModal';
import { RealizadoHeader, ProductCompactCard, ClientGroup, ThreeColumnLayout } from '@/components/Realizado';
import { RealizadoItemEmbalagem, RealizadoGroup } from '@/domain/types/realizado';
import { useLatestDataDate } from '@/hooks/useLatestDataDate';
import { isSpecialPhotoClient } from '@/config/photoRules';

type PainelItem = RealizadoItemEmbalagem & {
  pacoteFotoId?: string;
  pacoteFotoUploadedAt?: string;
  etiquetaFotoId?: string;
  etiquetaFotoUploadedAt?: string;
  palletFotoId?: string;
  palletFotoUploadedAt?: string;
  pedidoCaixas?: number;
  pedidoPacotes?: number;
  pedidoUnidades?: number;
  pedidoKg?: number;
};

function getPhotoStatus(item: PainelItem): { hasPhoto: boolean; color: 'white' | 'yellow' | 'red' } {
  const hasPacote = Boolean(item.pacoteFotoUrl);
  const hasEtiqueta = Boolean(item.etiquetaFotoUrl);
  const hasPallet = Boolean(item.palletFotoUrl);
  const isSpecial = isSpecialPhotoClient(item.cliente);
  
  // Se não tem produção, não mostra ícone
  if (item.produzido === 0) {
    return { hasPhoto: false, color: 'white' };
  }
  
  // Se tem produção mas não tem fotos
  if (!hasPacote && !hasEtiqueta && !hasPallet) {
    return { hasPhoto: true, color: 'red' };
  }
  
  // Verificar se tem todas as fotos necessárias
  const hasAllPhotos = isSpecial 
    ? hasPacote && hasPallet 
    : hasPacote && hasEtiqueta && hasPallet;
  
  return {
    hasPhoto: true,
    color: hasAllPhotos ? 'white' : 'yellow',
  };
}

export default function ProducaoEmbalagemPage() {
  const latestDate = useLatestDataDate('embalagem');
  const [items, setItems] = useState<PainelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(latestDate);
  const [producaoModalOpen, setProducaoModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PainelItem | null>(null);
  const [producaoLoading, setProducaoLoading] = useState(false);
  const [loadingCardId, setLoadingCardId] = useState<string | null>(null);
  const [photoDropdownOpen, setPhotoDropdownOpen] = useState<string | null>(null);

  // Atualizar selectedDate quando latestDate é carregado
  useEffect(() => {
    setSelectedDate(latestDate);
  }, [latestDate]);

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
        pedidoCaixas: data.data.pedidoCaixas || 0,
        pedidoPacotes: data.data.pedidoPacotes || 0,
        pedidoUnidades: data.data.pedidoUnidades || 0,
        pedidoKg: data.data.pedidoKg || 0,
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
      const dataFab = item.dataFabricacao || selectedDate;
      const obs = item.observacao?.trim() || '';
      const groupKey = `${item.cliente}|${dataFab}|${obs}`;
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
    });
    
    return Object.entries(groups).map(([groupKey, groupItems]) => {
      const [cliente, dataFab, obs] = groupKey.split('|');
      return {
        key: groupKey,
        cliente,
        dataFabricacao: dataFab,
        observacao: obs || undefined,
        items: groupItems,
      };
    });
  }, [items, selectedDate]);

  const handlePhotoClick = (item: PainelItem) => {
    const itemKey = `${item.cliente}-${item.produto}-${item.rowId}`;
    setPhotoDropdownOpen(photoDropdownOpen === itemKey ? null : itemKey);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <RealizadoHeader
        title="Realizado: Embalagem"
        icon="📦"
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
            renderGroup={(group) => {
              const embalagemGroup = group as RealizadoGroup & {
                cliente?: string;
                dataFabricacao?: string;
                observacao?: string;
              };
              
              return (
                <ClientGroup
                  cliente={embalagemGroup.cliente}
                  dataFabricacao={embalagemGroup.dataFabricacao}
                  observacao={embalagemGroup.observacao}
                  selectedDate={selectedDate}
                >
                  {group.items.map((item, idx) => {
                    const embalagemItem = item as PainelItem;
                    const itemKey = `${embalagemItem.cliente}-${embalagemItem.produto}-${embalagemItem.rowId}`;
                    const isItemLoading = loadingCardId === itemKey;
                    const photoStatus = getPhotoStatus(embalagemItem);
                    
                    return (
                      <div key={`${embalagemItem.produto}-${idx}`} className="relative">
                        <ProductCompactCard
                          produto={embalagemItem.produto}
                          produzido={embalagemItem.produzido}
                          aProduzir={embalagemItem.aProduzir}
                          unidade={embalagemItem.unidade}
                          congelado={embalagemItem.congelado === 'Sim'}
                          hasPhoto={photoStatus.hasPhoto}
                          photoColor={photoStatus.color}
                          onPhotoClick={() => handlePhotoClick(embalagemItem)}
                          onClick={() => handleEditProducao(embalagemItem)}
                          isLoading={isItemLoading}
                          caixas={embalagemItem.caixas}
                          pacotes={embalagemItem.pacotes}
                          unidades={embalagemItem.unidades}
                          kg={embalagemItem.kg}
                          pedidoCaixas={embalagemItem.pedidoCaixas}
                          pedidoPacotes={embalagemItem.pedidoPacotes}
                          pedidoUnidades={embalagemItem.pedidoUnidades}
                          pedidoKg={embalagemItem.pedidoKg}
                        />
                        
                        {/* Dropdown de fotos */}
                        {photoDropdownOpen === itemKey && (embalagemItem.pacoteFotoUrl || embalagemItem.etiquetaFotoUrl || embalagemItem.palletFotoUrl) && (
                          <div className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 min-w-[200px]">
                            {embalagemItem.pacoteFotoUrl && (
                              <a
                                href={embalagemItem.pacoteFotoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                                onClick={() => setPhotoDropdownOpen(null)}
                              >
                                <span className="text-sm">📦</span>
                                <span className="text-sm">Foto do Pacote</span>
                              </a>
                            )}
                            {embalagemItem.etiquetaFotoUrl && (
                              <a
                                href={embalagemItem.etiquetaFotoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                                onClick={() => setPhotoDropdownOpen(null)}
                              >
                                <span className="text-sm">🏷️</span>
                                <span className="text-sm">Foto da Etiqueta</span>
                              </a>
                            )}
                            {embalagemItem.palletFotoUrl && (
                              <a
                                href={embalagemItem.palletFotoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                                onClick={() => setPhotoDropdownOpen(null)}
                              >
                                <span className="text-sm">🚛</span>
                                <span className="text-sm">Foto do Pallet</span>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </ClientGroup>
              );
            }}
          />
        )}

        <footer className="mt-6 text-center text-gray-400 text-sm">
          {groupedItems.length} grupos • {items.length} itens
        </footer>
      </div>

      {/* Fechar dropdowns ao clicar fora */}
      {photoDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setPhotoDropdownOpen(null)}
        />
      )}

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
        mode="embalagem"
      />
    </div>
  );
}
