'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { desmarcarFornecedorIgnorado } from '@/app/actions/insumo-fornecedor-ignorado-actions';
import ConfigPageHeader from '@/components/Config/ConfigPageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Toast } from '@/components/ui/Toast';
import { formatarCnpj } from '@/domain/insumos/insumo-cnpj';
import type { InsumoFornecedorIgnoradoRow } from '@/domain/types/insumo-estoque-db';
import InsumoDesmarcarFornecedorDialog from '@/features/insumo-estoque/components/InsumoDesmarcarFornecedorDialog';

type Props = {
  initialFornecedores: InsumoFornecedorIgnoradoRow[];
};

type ToastState = { type: 'ok' | 'err'; text: string };

function rotuloFornecedor(row: InsumoFornecedorIgnoradoRow): string {
  return (
    row.fornecedor_razao_social?.trim() ||
    row.fornecedor_nome?.trim() ||
    'Fornecedor'
  );
}

function rotuloDialog(row: InsumoFornecedorIgnoradoRow): string {
  return `${rotuloFornecedor(row)} (${formatarCnpj(row.fornecedor_cnpj)})`;
}

export default function FornecedoresIgnoradosClient({ initialFornecedores }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<InsumoFornecedorIgnoradoRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (next: ToastState) => {
    setToast(next);
    setTimeout(() => setToast(null), 4000);
  };

  const handleConfirm = async (restaurar: boolean) => {
    if (!selected || busy) return;
    setBusy(true);
    try {
      const result = await desmarcarFornecedorIgnorado({
        empresaId: selected.empresa_id,
        cnpj: selected.fornecedor_cnpj,
        restaurarPendencias: restaurar,
      });

      setSelected(null);

      if (!result.success) {
        showToast({ type: 'err', text: result.error });
        return;
      }

      showToast({
        type: 'ok',
        text: restaurar
          ? 'Fornecedor desmarcado e pendências restauradas'
          : 'Fornecedor desmarcado',
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <ConfigPageHeader
        title="Fornecedores ignorados"
        icon="block"
        description="Fornecedores Omie sempre ignorados no mapeamento de insumos."
      />

      {toast ? (
        <Toast
          tone={toast.type === 'ok' ? 'success' : 'error'}
          onClose={() => setToast(null)}
        >
          {toast.text}
        </Toast>
      ) : null}

      <Card
        padding="none"
        aria-label="Lista de fornecedores ignorados"
        className="overflow-hidden"
      >
        {initialFornecedores.length === 0 ? (
          <EmptyState
            icon="block"
            title="Nenhum fornecedor ignorado"
            description='Use "Ignorar tudo deste fornecedor" no mapeamento.'
          />
        ) : (
          <>
            <div className="hidden md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-100 text-xs uppercase tracking-wide text-stone-500">
                    <th className="px-4 py-3 font-medium">Fornecedor</th>
                    <th className="px-4 py-3 font-medium">CNPJ</th>
                    <th className="px-4 py-3 font-medium">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {initialFornecedores.map((row) => (
                    <tr key={row.id} className="hover:bg-amber-50/60">
                      <td className="px-4 py-3 font-medium text-stone-900">
                        {rotuloFornecedor(row)}
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums text-stone-700">
                        {formatarCnpj(row.fornecedor_cnpj)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          variant="secondary"
                          size="lg"
                          onClick={() => setSelected(row)}
                        >
                          Desmarcar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-stone-100 md:hidden">
              {initialFornecedores.map((row) => (
                <li
                  key={row.id}
                  className="flex min-h-14 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-stone-900">{rotuloFornecedor(row)}</p>
                    <p className="mt-0.5 font-mono text-sm tabular-nums text-stone-600">
                      {formatarCnpj(row.fornecedor_cnpj)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    className="w-full sm:w-auto"
                    onClick={() => setSelected(row)}
                  >
                    Desmarcar
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <InsumoDesmarcarFornecedorDialog
        open={Boolean(selected)}
        fornecedorLabel={selected ? rotuloDialog(selected) : ''}
        busy={busy}
        onCancel={() => {
          if (!busy) setSelected(null);
        }}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
