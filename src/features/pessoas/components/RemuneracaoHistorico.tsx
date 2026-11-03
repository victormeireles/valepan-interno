'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { RemuneracaoCentavos } from '@/domain/pessoas/remuneracao-centavos';
import { RemuneracaoData, type RemuneracaoLinhaVisivel } from '@/domain/pessoas/remuneracao-quadro';

const centavos = new RemuneracaoCentavos();
const data = new RemuneracaoData();

export function RemuneracaoHistorico({
  linhas,
  confirmando,
  pendente,
  onCorrigir,
  onPedirApagar,
  onCancelarApagar,
  onApagar,
}: {
  linhas: RemuneracaoLinhaVisivel[];
  confirmando: string | null;
  pendente: boolean;
  onCorrigir: (inicio: string) => void;
  onPedirApagar: (inicio: string) => void;
  onCancelarApagar: () => void;
  onApagar: (inicio: string) => void;
}) {
  if (linhas.length === 0) return null;
  return (
    <ul className="flex flex-col gap-2">
      {linhas.map((linha) => (
        <li key={linha.id} className="rounded-xl border border-stone-200 px-3 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm tabular-nums text-stone-800">{data.exibir(linha.inicio)}</span>
            {linha.marca === 'vigente' ? <Badge tone="accent">Vigente</Badge> : null}
            {linha.marca === 'futura' ? <Badge tone="neutral">Futura</Badge> : null}
          </div>
          <p className="mt-1 font-mono text-sm tabular-nums text-stone-700">
            Salário {centavos.formatar(linha.salarioCentavos)} · Valor do vale transporte {centavos.formatar(linha.valeTransporteCentavos)} · Vale alimentação/refeição {centavos.formatar(linha.valeAlimentacaoCentavos)} · Plano de saúde {linha.planoSaude ? 'Sim' : 'Não'}
          </p>
          {confirmando === linha.inicio ? (
            <div className="mt-2 flex flex-col gap-2">
              <p className="text-sm text-stone-700">{data.confirmacao(linha.inicio)}</p>
              <div className="flex gap-2">
                <Button type="button" variant="danger" disabled={pendente} onClick={() => onApagar(linha.inicio)}>Apagar</Button>
                <Button type="button" variant="secondary" onClick={onCancelarApagar}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <div className="mt-2 flex gap-2">
              <Button type="button" variant="secondary" onClick={() => onCorrigir(linha.inicio)}>Corrigir</Button>
              <Button type="button" variant="ghost" onClick={() => onPedirApagar(linha.inicio)}>Apagar</Button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
