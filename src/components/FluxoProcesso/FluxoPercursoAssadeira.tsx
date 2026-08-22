'use client';

import type { FluxoEtapaKey, VpFluxoPayload } from '@/domain/fluxo-processo/fluxo-processo-types';
import type { FluxoPercursoCelulaFiltro } from '@/domain/fluxo-processo/fluxo-produtos-hora';
import { useFluxoDisplay } from './fluxo-display-context';
import { fmtCellShort, fmtQty } from './fluxo-display-scale';
import FluxoOverflowX from './FluxoOverflowX';
import { FluxoHoraTrack } from './fluxo-hora-track';
import { diaAnteriorLabelFromDia } from './fluxo-processo-format';

const LABEL_W = 108;
const TOTAL_W = 84;
const HORAS = Array.from({ length: 24 }, (_, i) => i);

type FluxoPercursoAssadeiraProps = {
  fluxo: VpFluxoPayload;
  ass: string;
  filtro: FluxoPercursoCelulaFiltro | null;
  onFiltroChange: (filtro: FluxoPercursoCelulaFiltro | null) => void;
};

/**
 * Heatmap etapa × hora. Células com volume são botões (drill-down).
 */
export default function FluxoPercursoAssadeira({
  fluxo,
  ass,
  filtro,
  onFiltroChange,
}: FluxoPercursoAssadeiraProps) {
  const { scale } = useFluxoDisplay();
  const linhas = (['ferm', 'forno', 'emb'] as FluxoEtapaKey[]).map((k) => ({
    k,
    nome: fluxo.etapas.find((e) => e.key === k)?.nome ?? k,
    v: HORAS.map((h) => scale.celula(k, ass, h)),
  }));
  const max = Math.max(1, ...linhas.flatMap((l) => l.v));
  const cor = fluxo.cores[ass] ?? '#A8A29E';
  const antLabel = diaAnteriorLabelFromDia(fluxo.dia);
  const a = fluxo.assadeiras.find((x) => x.nome === ass);

  const janela = (v: number[]): [number, number] | null => {
    const i = v.findIndex((x) => x > 0);
    if (i < 0) return null;
    let f = v.length - 1;
    while (v[f] === 0) f -= 1;
    return [i, f];
  };

  const fermTot = scale.assadeiraEtapaTotal(ass, 'ferm');
  const fornoTot = scale.assadeiraEtapaTotal(ass, 'forno');
  const embTot = scale.assadeiraEtapaTotal(ass, 'emb');
  const embAnt = scale.assadeiraEmbAntTotal(ass);

  const toggleCelula = (etapa: FluxoEtapaKey, hora: number, volume: number) => {
    if (volume <= 0) return;
    const mesma =
      filtro?.etapa === etapa && filtro.hora === hora;
    onFiltroChange(mesma ? null : { etapa, hora });
  };

  return (
    <div className="min-w-0">
      <FluxoOverflowX label="Percurso da assadeira por hora">
        <div style={{ minWidth: FluxoHoraTrack.innerMinWidthPx(LABEL_W + TOTAL_W) }}>
          <div className="flex">
            <div
              className="sticky left-0 z-10 shrink-0 bg-surface"
              style={{ width: LABEL_W }}
            />
            {HORAS.map((h) => (
              <div
                key={h}
                className={[
                  'min-w-11 flex-1 pb-1 text-center font-mono text-[9px] tabular-nums',
                  filtro?.hora === h ? 'font-bold text-text-strong' : 'text-text-faint',
                ].join(' ')}
              >
                {String(h).padStart(2, '0')}
              </div>
            ))}
            <div className="shrink-0" style={{ width: TOTAL_W }} />
          </div>

          {linhas.map((l) => {
            const j = janela(l.v);
            const tot = l.v.reduce((t, x) => t + x, 0);
            const linhaAtiva = filtro?.etapa === l.k;
            return (
              <div key={l.k} className="mb-1 flex items-center">
                <div
                  className="sticky left-0 z-10 shrink-0 bg-surface pr-2.5 text-right"
                  style={{ width: LABEL_W }}
                >
                  <div
                    className={[
                      'truncate text-sm font-semibold text-text-strong',
                      linhaAtiva ? 'font-bold' : '',
                    ].join(' ')}
                  >
                    {l.nome}
                  </div>
                  <div className="font-mono text-[9.5px] tabular-nums text-text-faint">
                    {j
                      ? `${String(j[0]).padStart(2, '0')}h → ${String(j[1]).padStart(2, '0')}h`
                      : 'não passou'}
                  </div>
                </div>
                <div className="flex min-w-0 flex-1 gap-0.5">
                  {HORAS.map((h) => {
                    const v = l.v[h];
                    const intensity = Math.round(14 + Math.sqrt(v / max) * 86);
                    const selecionada = filtro?.etapa === l.k && filtro.hora === h;
                    const clicavel = v > 0;

                    if (!clicavel) {
                      return (
                        <div
                          key={h}
                          className="grid h-11 min-w-11 flex-1 place-items-center rounded-md border border-border-default bg-surface-sunken"
                          aria-hidden
                        />
                      );
                    }

                    return (
                      <button
                        key={h}
                        type="button"
                        aria-pressed={selecionada}
                        aria-label={`${l.nome}, ${String(h).padStart(2, '0')}:00, ${fmtQty(v, scale.mode)} ${scale.unitLabel}. Clique para ver produtos`}
                        title="Ver produtos desta hora"
                        onClick={() => toggleCelula(l.k, h, v)}
                        className={[
                          'grid h-11 min-w-11 flex-1 cursor-pointer place-items-center rounded-md border-none',
                          'transition-[transform,box-shadow] duration-150 ease-out',
                          'hover:-translate-y-px hover:shadow-sm',
                          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-500',
                          'active:translate-y-0',
                          selecionada ? 'ring-2 ring-amber-500 ring-offset-1' : '',
                        ].join(' ')}
                        style={{
                          background: `color-mix(in srgb, ${cor} ${intensity}%, white)`,
                        }}
                      >
                        <span
                          className="font-mono text-[9px] font-bold tabular-nums"
                          style={{
                            color:
                              Math.sqrt(v / max) > 0.62 ? '#fff' : 'var(--text-strong)',
                          }}
                        >
                          {fmtCellShort(v, scale.mode)}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="shrink-0 pl-2.5 text-right" style={{ width: TOTAL_W }}>
                  <div
                    className={[
                      'font-mono text-sm font-bold tabular-nums',
                      tot ? 'text-text-strong' : 'text-text-faint',
                    ].join(' ')}
                  >
                    {tot ? fmtQty(tot, scale.mode) : '—'}
                  </div>
                  <div className="text-[9.5px] text-text-faint">{scale.unitLabel} no dia</div>
                </div>
              </div>
            );
          })}
        </div>
      </FluxoOverflowX>

      <div className="mt-1.5 text-[10.5px] text-text-faint">
        Toque numa célula para ver os produtos daquela hora
      </div>

      {a ? (
        <div className="mt-2.5 flex flex-wrap gap-4 text-[11.5px] text-text-muted">
          {fermTot - fornoTot > 0 ? (
            <span>
              <strong className="font-mono tabular-nums text-text-body">
                {fmtQty(fermTot - fornoTot, scale.mode)} {scale.unitLabel}
              </strong>{' '}
              fermentaram e não foram assadas no dia
            </span>
          ) : null}
          {embTot - fornoTot > 0 ? (
            <span>
              <strong className="font-mono tabular-nums text-text-body">
                {fmtQty(embTot - fornoTot, scale.mode)} {scale.unitLabel}
              </strong>{' '}
              embaladas além do que se assou —{' '}
              {embAnt
                ? `${fmtQty(embAnt, scale.mode)} ${scale.unitLabel} são de OP de ${antLabel}`
                : 'vieram de estoque do dia anterior'}
            </span>
          ) : null}
          {embTot - fornoTot < 0 ? (
            <span>
              <strong className="font-mono tabular-nums text-text-body">
                {fmtQty(fornoTot - embTot, scale.mode)} {scale.unitLabel}
              </strong>{' '}
              assadas e ainda não embaladas
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
