'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import RealizadoEtapa from '@/components/Realizado/RealizadoEtapa';
import SaidasRealizadoModal from '@/components/Saidas/SaidasRealizadoModal';
import NovaSaidaModal from '@/components/Saidas/NovaSaidaModal';
import {
  buildSaidasItemLookup,
  buildSaidasWorklistData,
  SAIDAS_ETAPA_CONFIG,
} from '@/domain/saidas/saidas-etapa-adapter';
import {
  saidasToDashboardItems,
  sumSaidaCaixas,
} from '@/domain/saidas/saidas-dashboard-adapter';
import { SaidaSheetRecord, SaidaQuantidade } from '@/domain/types/saidas';
import { useLatestDataDate } from '@/hooks/useLatestDataDate';
import { addCalendarDaysISO } from '@/lib/utils/date-utils';

type RealizadoContext = {
  rowId: string;
  item: SaidaSheetRecord;
};

type NovaSaidaPayload = {
  data: string;
  cliente: string;
  produto: string;
  observacao?: string;
  quantidade: SaidaQuantidade;
};

function getVisibleErrorMessage(error: unknown, fallback: string): string | null {
  const message = error instanceof Error ? error.message : fallback;
  return /fail(?:ed)? to fetch/i.test(message) ? null : message;
}

export default function RealizadoSaidasPage() {
  const latestDate = useLatestDataDate('saidas');
  const [items, setItems] = useState<SaidaSheetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(latestDate);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContext, setModalContext] = useState<RealizadoContext | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [loadingCardId, setLoadingCardId] = useState<string | null>(null);
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

    void loadOptions();
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
        setItems((data.items || []) as SaidaSheetRecord[]);
      } catch (error) {
        setMessage(getVisibleErrorMessage(error, 'Erro ao carregar o painel'));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [selectedDate]);

  const refreshPainel = useCallback(async () => {
    try {
      const res = await fetch(`/api/painel/saidas?date=${selectedDate}`);
      const data = await res.json();
      if (res.ok) setItems((data.items || []) as SaidaSheetRecord[]);
    } catch (error) {
      console.error('Erro ao recarregar painel de saídas:', error);
    }
  }, [selectedDate]);

  const itemLookup = useMemo(() => buildSaidasItemLookup(items), [items]);

  const handleEdit = useCallback(async (item: SaidaSheetRecord) => {
    if (!item.id) {
      setMessage('Este item não pode ser editado');
      return;
    }

    try {
      setLoadingCardId(item.id);
      setModalLoading(true);
      const res = await fetch(`/api/producao/saidas/${item.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar dados da saída');

      const enrichedItem: SaidaSheetRecord = {
        ...item,
        realizado: data.data.realizado,
        meta: data.data.meta,
        fotoUrl: data.data.fotoUrl || item.fotoUrl,
        fotoId: data.data.fotoId || item.fotoId,
        saidaUpdatedAt: data.data.saidaUpdatedAt || item.saidaUpdatedAt,
      };

      setModalContext({ rowId: item.id, item: enrichedItem });
      setModalOpen(true);
    } catch (error) {
      setMessage(getVisibleErrorMessage(error, 'Erro ao carregar dados da saída'));
    } finally {
      setModalLoading(false);
      setLoadingCardId(null);
    }
  }, []);

  const handleEditById = useCallback(
    (itemId: string) => {
      const item = itemLookup.get(itemId);
      if (item) void handleEdit(item);
    },
    [itemLookup, handleEdit],
  );

  const handleSaveRealizado = async ({
    realizado,
    uploadFile,
    removeExistingPhoto,
  }: {
    realizado: SaidaQuantidade;
    uploadFile?: File;
    removeExistingPhoto?: boolean;
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
        formData.append('rowId', modalContext.rowId);
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
      } = {
        realizado,
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
      setMessage(getVisibleErrorMessage(error, 'Erro ao salvar saída'));
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

        const rows = (painelData.items || []) as SaidaSheetRecord[];
        const candidate = [...rows]
          .reverse()
          .find(
            (row) =>
              row.data === data &&
              row.cliente === cliente &&
              row.produto === produto &&
              (!row.saidaUpdatedAt || !row.fotoUrl),
          );

        if (!candidate?.id) {
          throw new Error('Saída criada, mas não foi possível identificar a linha para anexar foto');
        }

        const formData = new FormData();
        formData.append('photo', foto);
        formData.append('rowId', candidate.id);
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

        await fetch(`/api/producao/saidas/${candidate.id}`, {
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
      setMessage(getVisibleErrorMessage(error, 'Erro ao registrar saída'));
      throw error;
    } finally {
      setNovaSaidaLoading(false);
    }
  };

  const totalCaixas = useMemo(() => sumSaidaCaixas(items), [items]);

  const worklist = useMemo(
    () =>
      buildSaidasWorklistData({
        items,
        selectedDate,
        loadingCardId,
      }),
    [items, selectedDate, loadingCardId],
  );

  const dashboardItems = useMemo(() => saidasToDashboardItems(items), [items]);

  const groupCount = worklist.gruposAtivos.length;

  return (
    <>
      <RealizadoEtapa
        config={SAIDAS_ETAPA_CONFIG}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        toolbar={{
          produzido: totalCaixas,
          meta: 0,
          falta: 0,
          progressoPct: 0,
          metaAtingida: false,
        }}
        loading={loading}
        refreshing={false}
        message={message}
        worklist={worklist}
        dashboardSaidas={{
          items: dashboardItems,
          totalCaixas,
          comparisonPrev: null,
          comparisonWeek: {
            date: addCalendarDaysISO(selectedDate, -7),
            items: [],
          },
        }}
        footer={{
          grupos: groupCount,
          pedidos: items.length,
          produzidoLabel: '',
          metaLabel: '',
          customLine: `${groupCount} grupo${groupCount !== 1 ? 's' : ''} • ${items.length} item${items.length !== 1 ? 's' : ''}`,
        }}
        callbacks={{
          onNovoLote: handleEditById,
          onEditLote: handleEditById,
          onDeleteLote: () => {},
        }}
        onExtraAction={() => setNovaSaidaOpen(true)}
      />

      {modalContext ? (
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
      ) : null}

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
    </>
  );
}
