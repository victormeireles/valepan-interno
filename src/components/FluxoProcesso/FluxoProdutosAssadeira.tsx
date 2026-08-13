'use client';

import type { VpFluxoPayload } from '@/domain/fluxo-processo/fluxo-processo-types';
import {
  FluxoProdutosHoraFilter,
  type FluxoPercursoCelulaFiltro,
} from '@/domain/fluxo-processo/fluxo-produtos-hora';
import { useFluxoDisplay } from './fluxo-display-context';
import { fmtQty } from './fluxo-display-scale';

const produtosFilter = new FluxoProdutosHoraFilter();

type FluxoProdutosAssadeiraProps = {
  fluxo: VpFluxoPayload;
  ass: string;
  filtro: FluxoPercursoCelulaFiltro | null;
};

export default function FluxoProdutosAssadeira({
  fluxo,
  ass,
  filtro,
}: FluxoProdutosAssadeiraProps) {
  const { scale } = useFluxoDisplay();
  const a = fluxo.assadeiras.find((x) => x.nome === ass);
  if (!a) return null;

  const produtos = produtosFilter.apply(a.produtos, filtro);
  const colAtiva = filtro?.etapa ?? null;

  return (
    <table className="mt-1 w-full border-collapse">
      <thead>
        <tr>
          {(
            [
              ['Produto', null],
              ['Fermentado', 'ferm'],
              ['Assado', 'forno'],
              ['Embalado', 'emb'],
            ] as const
          ).map(([h, key], i) => (
            <th
              key={h}
              className={[
                'pb-1.5 text-[9.5px] font-bold uppercase tracking-wide',
                i ? 'px-2 text-right' : 'px-2 text-left',
                colAtiva && key === colAtiva
                  ? 'text-amber-800'
                  : 'text-text-muted',
              ].join(' ')}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {produtos.length === 0 ? (
          <tr>
            <td
              colSpan={4}
              className="border-t border-stone-100 px-2 py-3 text-[12.5px] text-text-muted"
            >
              Nenhum produto nesta hora.
            </td>
          </tr>
        ) : (
          produtos.map((p) => (
            <tr key={p.nome}>
              <td className="border-t border-stone-100 px-2 py-1.5 text-[12.5px] text-text-strong">
                {p.nome}
              </td>
              {(['ferm', 'forno', 'emb'] as const).map((k) => {
                const v = scale.fromUn(p[k], ass);
                const destaque = colAtiva === k && v > 0;
                return (
                  <td
                    key={k}
                    className={[
                      'border-t border-stone-100 px-2 py-1.5 text-right font-mono text-xs tabular-nums',
                      destaque
                        ? 'font-bold text-text-strong'
                        : v
                          ? 'text-text-body'
                          : 'text-text-faint',
                    ].join(' ')}
                  >
                    {v ? fmtQty(v, scale.mode) : '—'}
                  </td>
                );
              })}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
