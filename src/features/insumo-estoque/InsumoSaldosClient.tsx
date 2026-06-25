'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { InsumoSaldoComDetalhes } from '@/domain/types/insumo-estoque';
import type { InsumoSaldosPageData } from '@/app/actions/insumo-estoque-actions';
import ConfigPageHeader from '@/components/Config/ConfigPageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Toast } from '@/components/ui/Toast';
import InsumoAjusteModal from '@/features/insumo-estoque/components/InsumoAjusteModal';
import InsumoHistoricoModal from '@/features/insumo-estoque/components/InsumoHistoricoModal';
import InsumoSaldoMobileList from '@/features/insumo-estoque/components/InsumoSaldoMobileList';
import InsumoSaldoTable from '@/features/insumo-estoque/components/InsumoSaldoTable';

type Props = {
  initialData: InsumoSaldosPageData;
};

export default function InsumoSaldosClient({ initialData }: Props) {
  const router = useRouter();
  const [saldos, setSaldos] = useState(initialData.saldos);
  const [pendenciasCount, setPendenciasCount] = useState(initialData.pendenciasCount);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [ajusteItem, setAjusteItem] = useState<InsumoSaldoComDetalhes | null>(null);
  const [historicoItem, setHistoricoItem] = useState<InsumoSaldoComDetalhes | null>(null);

  useEffect(() => {
    setSaldos(initialData.saldos);
    setPendenciasCount(initialData.pendenciasCount);
  }, [initialData]);

  const filteredSaldos = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return saldos;
    return saldos.filter((item) => item.nome.toLowerCase().includes(term));
  }, [saldos, searchTerm]);

  const handleRefresh = () => {
    router.refresh();
    setTimeout(() => setToast(null), 4000);
  };

  const handleSaved = (message: string) => {
    setToast(message);
    handleRefresh();
  };

  const saldosLabel =
    filteredSaldos.length === 1 ? '1 insumo' : `${filteredSaldos.length} insumos`;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <ConfigPageHeader
        title="Estoque de insumos"
        icon="grain"
        description="Saldos, histórico e ajustes manuais de insumos."
      />

      {toast ? (
        <Toast tone="success" onClose={() => setToast(null)}>
          {toast}
        </Toast>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-stone-500 font-mono tabular-nums" aria-live="polite">
          {saldosLabel}
          {pendenciasCount > 0 ? (
            <>
              {' • '}
              <Link
                href="/mapeamento-insumos"
                className="text-amber-700 underline-offset-2 hover:underline"
              >
                {pendenciasCount}{' '}
                {pendenciasCount === 1 ? 'pendência' : 'pendências'}
              </Link>
            </>
          ) : null}
        </p>
      </div>

      <Card padding="none" aria-label="Saldos de insumos" className="overflow-hidden">
        <div className="border-b border-stone-100 p-4">
          <Input
            id="insumo-saldos-search"
            type="search"
            icon="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar insumo..."
            aria-label="Buscar insumo"
          />
        </div>

        {filteredSaldos.length === 0 ? (
          <EmptyState
            icon="grain"
            title={searchTerm ? 'Nenhum saldo encontrado' : 'Nenhum saldo registrado'}
            description={
              searchTerm
                ? 'Tente ajustar a busca.'
                : 'Entradas por NF ou ajustes manuais aparecerão aqui.'
            }
            action={
              searchTerm ? (
                <Button variant="ghost" onClick={() => setSearchTerm('')}>
                  Limpar busca
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <InsumoSaldoTable
              items={filteredSaldos}
              onAjustar={setAjusteItem}
              onHistorico={setHistoricoItem}
              embedded
            />
            <InsumoSaldoMobileList
              items={filteredSaldos}
              onAjustar={setAjusteItem}
              onHistorico={setHistoricoItem}
            />
          </>
        )}
      </Card>

      <InsumoAjusteModal
        isOpen={Boolean(ajusteItem)}
        item={ajusteItem}
        onClose={() => setAjusteItem(null)}
        onSaved={() => handleSaved('Saldo ajustado com sucesso')}
      />

      <InsumoHistoricoModal
        isOpen={Boolean(historicoItem)}
        item={historicoItem}
        onClose={() => setHistoricoItem(null)}
      />
    </div>
  );
}
