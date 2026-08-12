'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { aplicarSeedPlanilha } from '@/app/actions/insumo-compra-regra-actions';
import ConfigPageHeader from '@/components/Config/ConfigPageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Toast } from '@/components/ui/Toast';
import InsumoRegraCompraFormModal from '@/features/insumo-compra-sugestao/components/InsumoRegraCompraFormModal';
import type { InsumoCompraRegraConfig } from '@/lib/services/insumo-compra-regra-manager';

type Props = {
  initialRegras: InsumoCompraRegraConfig[];
};

type ToastState = {
  tone: 'success' | 'error' | 'warning';
  text: string;
};

const DIA_LABEL: Record<number, string> = {
  0: 'Dom',
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sáb',
};

function janelaLabel(regra: InsumoCompraRegraConfig): string {
  if (!regra.regra) return 'Sem regra';
  if (regra.regra.janela_tipo === 'qualquer') return 'Qualquer dia';
  return (regra.regra.dias_semana ?? []).map((dia) => DIA_LABEL[dia] ?? dia).join(', ');
}

function quantidadeLabel(valor: number | null, unidade: string): string {
  if (valor == null) return '—';
  const quantidade = new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 3,
  }).format(valor);
  return unidade ? `${quantidade} ${unidade}` : quantidade;
}

function preferencialLabel(regra: InsumoCompraRegraConfig): string {
  return regra.distribuidores.find((distribuidor) => distribuidor.preferencial)?.nome ?? '—';
}

export default function RegrasCompraInsumosClient({ initialRegras }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<InsumoCompraRegraConfig | null>(null);
  const [importing, setImporting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (nextToast: ToastState) => {
    setToast(nextToast);
    setTimeout(() => setToast(null), 5000);
  };

  const handleSeed = async () => {
    if (importing) return;
    setImporting(true);

    try {
      const result = await aplicarSeedPlanilha();
      const naoEncontrados =
        result.naoEncontrados.length > 0
          ? ` Não encontrados: ${result.naoEncontrados.join(', ')}.`
          : '';
      showToast({
        tone: result.naoEncontrados.length > 0 ? 'warning' : 'success',
        text: `${result.atualizados} regras importadas.${naoEncontrados}`,
      });
      router.refresh();
    } catch (caughtError) {
      showToast({
        tone: 'error',
        text:
          caughtError instanceof Error
            ? caughtError.message
            : 'Erro ao importar planilha inicial.',
      });
    } finally {
      setImporting(false);
    }
  };

  const handleSaved = () => {
    showToast({ tone: 'success', text: 'Regra salva com sucesso.' });
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <ConfigPageHeader
        title="Regras de compra"
        icon="shopping_cart"
        description="Lead time, janela, limites e distribuidores por insumo."
        action={
          <Button
            type="button"
            variant="secondary"
            size="lg"
            icon="upload_file"
            className="w-full sm:w-auto"
            disabled={importing}
            onClick={() => void handleSeed()}
          >
            {importing ? 'Importando…' : 'Importar planilha inicial'}
          </Button>
        }
      />

      {toast ? (
        <Toast tone={toast.tone} onClose={() => setToast(null)}>
          {toast.text}
        </Toast>
      ) : null}

      <Card
        padding="none"
        aria-label="Lista de regras de compra"
        className="overflow-hidden"
      >
        {initialRegras.length === 0 ? (
          <EmptyState
            icon="shopping_cart"
            title="Nenhuma regra de compra"
            description="Importe a planilha inicial para cadastrar as regras dos insumos."
            action={
              <Button
                type="button"
                icon="upload_file"
                size="lg"
                disabled={importing}
                onClick={() => void handleSeed()}
              >
                Importar planilha inicial
              </Button>
            }
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-100 text-xs uppercase tracking-wide text-stone-500">
                    <th className="px-4 py-3 font-medium">Insumo</th>
                    <th className="px-3 py-3 text-right font-medium">Lead time</th>
                    <th className="px-3 py-3 font-medium">Janela</th>
                    <th className="px-3 py-3 text-right font-medium">Mínimo</th>
                    <th className="px-3 py-3 text-right font-medium">Máximo</th>
                    <th className="px-3 py-3 font-medium">Preferencial</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {initialRegras.map((regra) => (
                    <tr key={regra.insumoId} className="hover:bg-amber-50/60">
                      <td className="px-4 py-3 font-medium text-stone-900">{regra.nome}</td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums text-stone-700">
                        {regra.regra ? `${regra.regra.lead_time_dias} d` : '—'}
                      </td>
                      <td className="px-3 py-3 text-stone-700">{janelaLabel(regra)}</td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums text-stone-700">
                        {quantidadeLabel(regra.regra?.quantidade_minima ?? null, regra.unidade)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums text-stone-700">
                        {quantidadeLabel(regra.regra?.quantidade_maxima ?? null, regra.unidade)}
                      </td>
                      <td className="px-3 py-3 text-stone-700">
                        {preferencialLabel(regra)}
                      </td>
                      <td className="px-3 py-3">
                        <Badge tone={regra.regra?.ativo ? 'success' : 'neutral'}>
                          {regra.regra ? (regra.regra.ativo ? 'Ativa' : 'Inativa') : 'Sem regra'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          variant="secondary"
                          size="lg"
                          icon={regra.regra ? 'edit' : 'add'}
                          onClick={() => setEditing(regra)}
                        >
                          {regra.regra ? 'Editar' : 'Nova regra'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-stone-100 lg:hidden">
              {initialRegras.map((regra) => (
                <li key={regra.insumoId} className="space-y-3 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-stone-900">{regra.nome}</p>
                      <p className="mt-0.5 text-sm text-stone-600">{janelaLabel(regra)}</p>
                    </div>
                    <Badge tone={regra.regra?.ativo ? 'success' : 'neutral'}>
                      {regra.regra ? (regra.regra.ativo ? 'Ativa' : 'Inativa') : 'Sem regra'}
                    </Badge>
                  </div>

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-stone-500">Lead time</dt>
                      <dd className="font-mono tabular-nums text-stone-800">
                        {regra.regra ? `${regra.regra.lead_time_dias} d` : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-stone-500">
                        Preferencial
                      </dt>
                      <dd className="truncate text-stone-800">{preferencialLabel(regra)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-stone-500">Mínimo</dt>
                      <dd className="font-mono tabular-nums text-stone-800">
                        {quantidadeLabel(regra.regra?.quantidade_minima ?? null, regra.unidade)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-stone-500">Máximo</dt>
                      <dd className="font-mono tabular-nums text-stone-800">
                        {quantidadeLabel(regra.regra?.quantidade_maxima ?? null, regra.unidade)}
                      </dd>
                    </div>
                  </dl>

                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    icon={regra.regra ? 'edit' : 'add'}
                    fullWidth
                    onClick={() => setEditing(regra)}
                  >
                    {regra.regra ? 'Editar regra' : 'Nova regra'}
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <InsumoRegraCompraFormModal
        open={Boolean(editing)}
        regra={editing}
        onClose={() => setEditing(null)}
        onSaved={handleSaved}
      />
    </div>
  );
}
