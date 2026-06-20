'use client';

import EmbalagemDashboard from '@/components/Realizado/EmbalagemDashboard';
import { Toast } from '@/components/ui/Toast';
import { etapaTwoColumnGridClass } from '@/components/ui/page-shell';
import type { RealizadoEtapaProps } from './etapa/types';
import EtapaToolbar from './etapa/EtapaToolbar';
import EtapaWorklist from './etapa/EtapaWorklist';
import EtapaPageSkeleton from './etapa/EtapaPageSkeleton';
import EtapaResumoDashboard from './etapa/EtapaResumoDashboard';
import EtapaHourlyDashboard from './etapa/EtapaHourlyDashboard';
import EtapaSaidasDashboard from './etapa/EtapaSaidasDashboard';

export default function RealizadoEtapa({
  config,
  selectedDate,
  onDateChange,
  toolbar,
  loading,
  refreshing,
  message,
  worklist,
  dashboardHora,
  dashboardHoraLatas,
  dashboardSaidas,
  dashboardResumo,
  footer,
  callbacks,
  hasMeta: hasMetaProp,
  onExtraAction,
  overlaySlot,
  ritmoCompacto = false,
}: RealizadoEtapaProps) {
  const hasMeta = hasMetaProp ?? config.hasMeta ?? true;
  const messageTone = message?.includes('sucesso') ? 'success' : 'error';

  return (
    <div
      className="min-h-screen w-full text-text-strong"
      style={{ backgroundColor: config.pageBackground }}
    >
      <EtapaToolbar
        config={config}
        selectedDate={selectedDate}
        onDateChange={onDateChange}
        metrics={toolbar}
        hasMeta={hasMeta}
        onExtraAction={onExtraAction}
      />

      <div className="pb-10 pt-4">
        {message ? (
          <div className="mb-4">
            <Toast tone={messageTone}>{message}</Toast>
          </div>
        ) : null}

        {loading ? (
          <EtapaPageSkeleton stageName={config.stageName} dashboardType={config.dashboard} />
        ) : (
          <>
            {refreshing ? (
              <div
                className="mb-3 flex items-center gap-2 text-sm text-text-muted"
                role="status"
                aria-live="polite"
              >
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-stone-200 border-t-accent motion-reduce:animate-none" />
                Atualizando dados…
              </div>
            ) : null}

            <div
              className={[
                etapaTwoColumnGridClass,
                refreshing ? 'pointer-events-none opacity-70' : '',
              ].join(' ')}
            >
              <div className="order-1 min-w-0 overflow-x-hidden min-[960px]:order-none">
                <EtapaWorklist
                  config={config}
                  worklist={worklist}
                  callbacks={callbacks}
                  hasMeta={hasMeta}
                />
              </div>

              <div className="order-2 min-w-0 overflow-x-hidden min-[960px]:order-none">
                {config.dashboard === 'hora' && config.unit === 'cx' && hasMeta && dashboardHora ? (
                  <EmbalagemDashboard
                    selectedDate={selectedDate}
                    items={dashboardHora.items}
                    comparisonPrev={dashboardHora.comparisonPrev}
                    comparisonWeek={dashboardHora.comparisonWeek}
                    ritmoCompacto={ritmoCompacto}
                  />
                ) : null}

                {config.dashboard === 'hora' && config.unit === 'cx' && !hasMeta && dashboardSaidas ? (
                  <EtapaSaidasDashboard
                    selectedDate={selectedDate}
                    unitLabel={config.unit}
                    unitName={config.unitName}
                    totalCaixas={dashboardSaidas.totalCaixas}
                    items={dashboardSaidas.items}
                    comparisonPrev={dashboardSaidas.comparisonPrev}
                    comparisonWeek={dashboardSaidas.comparisonWeek}
                  />
                ) : null}

                {config.dashboard === 'hora' && config.unit === 'lt' && dashboardHoraLatas ? (
                  <EtapaHourlyDashboard
                    selectedDate={selectedDate}
                    unitLabel={config.unit}
                    unitName={config.unitName}
                    items={dashboardHoraLatas.items}
                    comparisonPrev={dashboardHoraLatas.comparisonPrev}
                    comparisonWeek={dashboardHoraLatas.comparisonWeek}
                  />
                ) : null}

                {config.dashboard === 'resumo' && dashboardResumo ? (
                  <EtapaResumoDashboard
                    config={config}
                    selectedDate={selectedDate}
                    data={dashboardResumo}
                  />
                ) : null}
              </div>
            </div>

            <footer className="mt-6 text-center text-sm text-text-muted">
              {footer.customLine ??
                `${footer.grupos} grupos • ${footer.pedidos} pedidos • ${footer.produzidoLabel} / ${footer.metaLabel}`}
            </footer>
          </>
        )}
      </div>

      {overlaySlot}
    </div>
  );
}

export type { RealizadoEtapaConfig, RealizadoEtapaProps } from './etapa/types';
