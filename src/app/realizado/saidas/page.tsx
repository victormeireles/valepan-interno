'use client';

import { useEffect, useMemo, useState } from 'react';
import RealizadoHeader from '@/components/Realizado/RealizadoHeader';
import ThreeColumnLayout from '@/components/Realizado/ThreeColumnLayout';
import ProductCompactCard from '@/components/Realizado/ProductCompactCard';
import ClientGroup from '@/components/Realizado/ClientGroup';
import { QuantityBreakdown } from '@/domain/valueObjects/QuantityBreakdown';
import { SaidaSheetRecord, SaidaQuantidade } from '@/domain/types/saidas';
import { useLatestDataDate } from '@/hooks/useLatestDataDate';
import SaidasRealizadoModal from '@/components/Saidas/SaidasRealizadoModal';
import NovaSaidaModal from '@/components/Saidas/NovaSaidaModal';
import { RealizadoGroup } from '@/domain/types/realizado';

const PRIMARY_ORDER: Array<keyof SaidaQuantidade> = ['caixas', 'pacotes', 'unidades', 'kg'];

const UNIT_LABEL: Record<keyof SaidaQuantidade, string> = {
  caixas: 'cx',
  pacotes: 'pct',
  unidades: 'un',
  kg: 'kg',
};

type PainelItem = SaidaSheetRecord;

type RealizadoContext = {
  rowId: number;
  item: PainelItem;
};

type NovaSaidaPayload = {
  data: string;
  cliente: string;
  produto: string;
  observacao?: string;
  quantidade: SaidaQuantidade;
};

function getPrimaryQuantity(meta: SaidaQuantidade, realizado: SaidaQuantidade) {
  for (const key of PRIMARY_ORDER) {
    const metaValue = meta[key] || 0;
    const realizadoValue = realizado[key] || 0;
    if (metaValue > 0 || realizadoValue > 0) {
      return {
        unit: UNIT_LABEL[key],
        metaValue,
        realizadoValue,
      };
    }
  }

  const fallbackMeta =
    (meta.caixas || 0) + (meta.pacotes || 0) + (meta.unidades || 0) + (meta.kg || 0);
  const fallbackRealizado =
    (realizado.caixas || 0) +
    (realizado.pacotes || 0) +
    (realizado.unidades || 0) +
    (realizado.kg || 0);

  return {
    unit: 'un',
    metaValue: fallbackMeta,
    realizadoValue: fallbackRealizado,
  };
}

export default function RealizadoSaidasPage() {
  const latestDate = useLatestDataDate('saidas');
  const [items, setItems] = useState<PainelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(latestDate);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContext, setModalContext] = useState<RealizadoContext | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [loadingCardId, setLoadingCardId] = useState<number | null>(null);
  const [novaSaidaOpen, setNovaSaidaOpen] = useState(false);
  const [novaSaidaLoading, setNovaSaidaLoading] = useState(false);
  const [clientesOptions, setClientesOptions] = useState<string[]>([]);
  const [produtosOptions, setProdutosOptions] = useState<string[]>([]);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [clientesRes, produtosRes] = await Promise.all([
          fetch('/api/options/saidas?type=clientes'),
          fetch('/api/options/saidas?type=produtos'),
        ]);
        const clientesData = await clientesRes.json();
        const produtosData = await produtosRes.json();
        if (clientesRes.ok) setClientesOptions(clientesData.options || []);
        if (produtosRes.ok) setProdutosOptions(produtosData.options || []);
      } catch (error) {
        console.error('Erro ao carregar opções de saídas:', error);
      }
    };

    loadOptions();
  }, []);

  useEffect(() => {
    setSelectedDate(latestDate);
  }, [latestDate]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/painel/saidas?date=${selectedDate}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Falha ao carregar painel');
        setItems((data.items || []) as PainelItem[]);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Erro ao carregar o painel');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [selectedDate]);

  const refreshPainel = async () => {
    try {
      const res = await fetch(`/api/painel/saidas?date=${selectedDate}`);
      const data = await res.json();
      if (res.ok) setItems((data.items || []) as PainelItem[]);
    } catch (error) {
      console.error('Erro ao recarregar painel de saídas:', error);
    }
  };

  const handleEdit = async (item: PainelItem) => {
    if (!item.rowIndex) {
      setMessage('Este item não pode ser editado');
      return;
    }

    try {
      setLoadingCardId(item.rowIndex);
      setModalLoading(true);
      const res = await fetch(`/api/producao/saidas/${item.rowIndex}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar dados da saída');

      const enrichedItem: PainelItem = {
        ...item,
        realizado: data.data.realizado,
        meta: data.data.meta,
        fotoUrl: data.data.fotoUrl || item.fotoUrl,
        fotoId: data.data.fotoId || item.fotoId,
        saidaUpdatedAt: data.data.saidaUpdatedAt || item.saidaUpdatedAt,
      };

      setModalContext({ rowId: item.rowIndex, item: enrichedItem });
      setModalOpen(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro ao carregar dados da saída');
    } finally {
      setModalLoading(false);
      setLoadingCardId(null);
    }
  };

  const handleSaveRealizado = async ({
    realizado,
    uploadFile,
    removeExistingPhoto,
    quantidadeInicial,
  }: {
    realizado: SaidaQuantidade;
    uploadFile?: File;
    removeExistingPhoto?: boolean;
    quantidadeInicial?: SaidaQuantidade;
  }) => {
    if (!modalContext) return;

    try {
      setModalLoading(true);
      setMessage(null);

      let nextFotoUrl = modalContext.item.fotoUrl || '';
      let nextFotoId = modalContext.item.fotoId || '';

      if (removeExistingPhoto && modalContext.item.fotoUrl) {
        const res = await fetch(
          `/api/photo/${modalContext.rowId}?type=saida&process=saidas`,
          { method: 'DELETE' },
        );
        const response = await res.json();
        if (!res.ok) throw new Error(response.error || 'Falha ao remover foto');
        nextFotoUrl = '';
        nextFotoId = '';
      }

      if (uploadFile) {
        const formData = new FormData();
        formData.append('photo', uploadFile);
        formData.append('rowId', modalContext.rowId.toString());
        formData.append('photoType', 'saida');
        formData.append('process', 'saidas');

        const uploadRes = await fetch('/api/upload/photo', {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadData.error || 'Falha ao enviar foto');
        }
        nextFotoUrl = uploadData.photoUrl;
        nextFotoId = uploadData.photoId;
      }

      const body: {
        realizado: SaidaQuantidade;
        fotoUrl?: string;
        fotoId?: string;
        quantidadeInicial?: SaidaQuantidade;
      } = {
        realizado,
        quantidadeInicial,
      };

      if (uploadFile || removeExistingPhoto) {
        body.fotoUrl = nextFotoUrl;
        body.fotoId = nextFotoId;
      }

      const res = await fetch(`/api/producao/saidas/${modalContext.rowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const response = await res.json();
      if (!res.ok) throw new Error(response.error || 'Falha ao salvar saída');

      setMessage('Saída atualizada com sucesso!');
      await refreshPainel();
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro ao salvar saída');
      throw error;
    } finally {
      setModalLoading(false);
    }
  };

  const handleNovaSaida = async ({
    data,
    cliente,
    produto,
    observacao,
    quantidade,
    foto,
  }: NovaSaidaPayload & { foto?: File | null }) => {
    try {
      setNovaSaidaLoading(true);
      setMessage(null);

      const res = await fetch('/api/producao/saidas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data,
          cliente,
          produto,
          observacao,
          meta: quantidade,
          // Pula notificação se houver foto (será enviada no PUT)
          skipNotification: !!foto,
        }),
      });
      const response = await res.json();
      if (!res.ok) throw new Error(response.error || 'Falha ao registrar saída');

      if (foto) {
        const painelRes = await fetch(`/api/painel/saidas?date=${data}`);
        const painelData = await painelRes.json();
        if (!painelRes.ok) {
          throw new Error('Saída criada, mas falhou ao localizar a linha para anexar foto');
        }

        const rows = (painelData.items || []) as PainelItem[];
        const candidate = [...rows]
          .reverse()
          .find((row) =>
            row.data === data &&
            row.cliente === cliente &&
            row.produto === produto &&
            (!row.saidaUpdatedAt || !row.fotoUrl)
          );

        if (!candidate?.rowIndex) {
          throw new Error('Saída criada, mas não foi possível identificar a linha para anexar foto');
        }

        const formData = new FormData();
        formData.append('photo', foto);
        formData.append('rowId', candidate.rowIndex.toString());
        formData.append('photoType', 'saida');
        formData.append('process', 'saidas');

        const uploadRes = await fetch('/api/upload/photo', {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadData.error || 'Falha ao enviar foto da saída');
        }

        await fetch(`/api/producao/saidas/${candidate.rowIndex}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            realizado: quantidade,
            fotoUrl: uploadData.photoUrl,
            fotoId: uploadData.photoId,
          }),
        });
      }

      await refreshPainel();
      setMessage('Saída registrada com sucesso!');
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro ao registrar saída');
      throw error;
    } finally {
      setNovaSaidaLoading(false);
    }
  };

  const groupedItems = useMemo((): RealizadoGroup[] => {
    const groups: { [key: string]: PainelItem[] } = {};
    
    items.forEach(item => {
      const data = item.data || selectedDate;
      const obs = item.observacao?.trim() || '';
      const groupKey = `${item.cliente}|${data}|${obs}`;
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
    });
    
    // Criar os grupos e ordenar itens dentro de cada grupo por rowIndex
    const groupsArray = Object.entries(groups).map(([groupKey, groupItems]) => {
      const [cliente, data, obs] = groupKey.split('|');
      
      // Ordenar itens dentro do grupo por rowIndex
      const sortedItems = [...groupItems].sort((a, b) => {
        const rowIdA = a.rowIndex ?? Number.MAX_SAFE_INTEGER;
        const rowIdB = b.rowIndex ?? Number.MAX_SAFE_INTEGER;
        return rowIdA - rowIdB;
      });
      
      const minRowId = Math.min(...sortedItems.map(item => item.rowIndex ?? Number.MAX_SAFE_INTEGER));
      
      return {
        key: groupKey,
        cliente,
        dataFabricacao: data,
        observacao: obs || undefined,
        items: sortedItems as unknown as RealizadoGroup['items'],
        minRowId,
      };
    });
    
    // Ordenar grupos pelo menor rowIndex de cada grupo
    const sortedGroups = groupsArray.sort((a, b) => {
      const minRowIdA = a.minRowId ?? Number.MAX_SAFE_INTEGER;
      const minRowIdB = b.minRowId ?? Number.MAX_SAFE_INTEGER;
      return minRowIdA - minRowIdB;
    });
    
    // Remover minRowId do objeto final (usado apenas para ordenação)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return sortedGroups.map(({ minRowId, ...group }) => group);
  }, [items, selectedDate]);

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#4b4943' }}>
      <RealizadoHeader
        title="Realizado: Saídas"
        icon="📤"
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
      />

      <div className="p-4">
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setNovaSaidaOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors text-sm font-medium"
          >
            + Nova Saída
          </button>
        </div>

        {message && (
          <div
            className={`mb-4 p-4 rounded-md border ${
              message.toLowerCase().includes('sucesso')
                ? 'bg-green-800/30 border-green-600 text-green-100'
                : 'bg-red-800/30 border-red-600 text-red-100'
            }`}
          >
            {message}
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-gray-200 text-xl">Carregando...</div>
        ) : (
          <ThreeColumnLayout
            groups={groupedItems}
            renderGroup={(group) => {
              const saidasGroup = group as RealizadoGroup & {
                cliente?: string;
                dataFabricacao?: string;
                observacao?: string;
              };
              
              return (
                <ClientGroup
                  cliente={saidasGroup.cliente}
                  dataFabricacao={saidasGroup.dataFabricacao}
                  observacao={saidasGroup.observacao}
                  selectedDate={selectedDate}
                >
                  {group.items.map((item, idx) => {
                    const saidaItem = item as unknown as PainelItem;
                    const itemKey = `${saidaItem.produto}-${saidaItem.rowIndex ?? idx}`;
                    const isItemLoading = loadingCardId === saidaItem.rowIndex;

                    const detalhesProduzido = QuantityBreakdown.buildEntries([
                      { quantidade: saidaItem.realizado.caixas, unidade: 'cx' },
                      { quantidade: saidaItem.realizado.pacotes, unidade: 'pct' },
                      { quantidade: saidaItem.realizado.unidades, unidade: 'un' },
                      { quantidade: saidaItem.realizado.kg, unidade: 'kg' },
                    ]);

                    const detalhesMeta = QuantityBreakdown.buildEntries([
                      { quantidade: saidaItem.meta.caixas, unidade: 'cx' },
                      { quantidade: saidaItem.meta.pacotes, unidade: 'pct' },
                      { quantidade: saidaItem.meta.unidades, unidade: 'un' },
                      { quantidade: saidaItem.meta.kg, unidade: 'kg' },
                    ]);

                    const primary = getPrimaryQuantity(saidaItem.meta, saidaItem.realizado);

                    return (
                      <ProductCompactCard
                        key={itemKey}
                        produto={saidaItem.produto}
                        produzido={primary.realizadoValue}
                        aProduzir={primary.metaValue}
                        unidade={primary.unit}
                        hasPhoto={Boolean(saidaItem.fotoUrl)}
                        photoColor="white"
                        onPhotoClick={() => {
                          if (saidaItem.fotoUrl) window.open(saidaItem.fotoUrl, '_blank');
                        }}
                        onClick={() => handleEdit(saidaItem)}
                        isLoading={isItemLoading}
                        detalhesProduzido={detalhesProduzido}
                        detalhesMeta={detalhesMeta}
                      />
                    );
                  })}
                </ClientGroup>
              );
            }}
          />
        )}

        <footer className="mt-6 text-center text-gray-200 text-sm">
          {groupedItems.length} grupo{groupedItems.length !== 1 ? 's' : ''} • {items.length} item{items.length !== 1 ? 's' : ''}
        </footer>
      </div>

      {modalContext && (
        <SaidasRealizadoModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setModalContext(null);
          }}
          onSubmit={handleSaveRealizado}
          onSaveSuccess={refreshPainel}
          loading={modalLoading}
          meta={modalContext.item.meta}
          initialRealizado={modalContext.item.realizado}
          existingPhotoUrl={modalContext.item.fotoUrl}
          existingPhotoId={modalContext.item.fotoId}
          cliente={modalContext.item.cliente}
          produto={modalContext.item.produto}
          rowId={modalContext.rowId}
        />
      )}

      <NovaSaidaModal
        isOpen={novaSaidaOpen}
        onClose={() => setNovaSaidaOpen(false)}
        onSubmit={async (payload) => {
          await handleNovaSaida({
            data: payload.data,
            cliente: payload.cliente,
            produto: payload.produto,
            observacao: payload.observacao,
            quantidade: payload.quantidade,
            foto: payload.foto,
          });
          setNovaSaidaOpen(false);
        }}
        clientesOptions={clientesOptions}
        produtosOptions={produtosOptions}
        loading={novaSaidaLoading}
      />
    </div>
  );
}

