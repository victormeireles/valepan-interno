'use client';

import { formatIsoDateToDDMMYYYY } from '@/lib/utils/date-utils';

interface OrdemProducaoHeaderProps {
  dataProducao: string;
  dataEtiquetaDefault: string;
  status: string;
  onPublish: () => Promise<void> | void;
  publishLoading: boolean;
  /** Sem tabelas no banco ou modo somente leitura: mantém o layout, bloqueia publicar. */
  publishDisabled?: boolean;
  /** Quando false, o dia já não está em rascunho — não faz sentido voltar a «marcar como pronto». */
  publishAllowed?: boolean;
}

export default function OrdemProducaoHeader({
  dataProducao,
  dataEtiquetaDefault,
  status,
  onPublish,
  publishLoading,
  publishDisabled = false,
  publishAllowed = true,
}: OrdemProducaoHeaderProps) {
  const blocked = publishDisabled || !publishAllowed;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-900">Ordem de producao diaria</h2>
          <p className="text-sm text-slate-600">
            Data de producao: <strong>{formatIsoDateToDDMMYYYY(dataProducao)}</strong> · Data etiqueta padrao:{' '}
            <strong>{formatIsoDateToDDMMYYYY(dataEtiquetaDefault)}</strong>
          </p>
          <p className="text-xs uppercase tracking-wide text-slate-500">Status: {status}</p>
        </div>
        <button
          type="button"
          onClick={() => void onPublish()}
          disabled={publishLoading || blocked}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          title={
            publishDisabled
              ? 'Indisponível neste modo.'
              : !publishAllowed
                ? 'Este dia já está marcado como pronto (ou em outro estado final).'
                : 'As ordens já são criadas ao adicionar/editar linhas. Marcar como pronto apenas sinaliza que o dia está fechado.'
          }
        >
          {publishLoading
            ? 'Marcando...'
            : publishDisabled
              ? 'Marcar dia como pronto'
              : !publishAllowed
                ? 'Dia já marcado'
                : 'Marcar dia como pronto'}
        </button>
      </div>
    </div>
  );
}
