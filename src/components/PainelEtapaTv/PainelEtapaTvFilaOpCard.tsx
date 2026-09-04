'use client';

import EtapaProductTitle from '@/components/Realizado/etapa/EtapaProductTitle';
import { formatPresoDuracao } from '@/components/FluxoProcesso/fluxo-fila-format';
import { Card } from '@/components/ui/Card';
import { PainelEtapaTvFilaCopy } from '@/domain/painel-etapa-tv/fila-anterior/painel-etapa-tv-fila-copy';
import type {
  PainelEtapaTvFilaEtapa,
  PainelEtapaTvFilaOp,
} from '@/domain/painel-etapa-tv/fila-anterior/painel-etapa-tv-fila-op';
import { formatCompactNumber } from '@/lib/utils/format-compact-number';

export type PainelEtapaTvFilaOpCardIdentity = {
  produto: string;
  assadeira?: string;
  assadeiraCorHex?: string;
  tipoEstoqueCliente?: string;
};

type PainelEtapaTvFilaOpCardProps = {
  etapa: PainelEtapaTvFilaEtapa;
  op: PainelEtapaTvFilaOp;
  identity: PainelEtapaTvFilaOpCardIdentity;
  showTipoEstoqueMarcaBadge?: boolean;
};

function formatLt(value: number): string {
  return `${formatCompactNumber(value)} LT`;
}

function tempoMaisAntigo(op: PainelEtapaTvFilaOp): string | null {
  if (op.oldestNaFilaMin <= 0) return null;
  return `há ${formatPresoDuracao(op.oldestNaFilaMin)}`;
}

function secondaryLine(etapa: PainelEtapaTvFilaEtapa, op: PainelEtapaTvFilaOp): string {
  const parts: string[] = [];
  if (op.vindoLt > 0) {
    parts.push(`${PainelEtapaTvFilaCopy.vindoLabel()} ${formatLt(op.vindoLt)}`);
  }
  const feitoLabel = PainelEtapaTvFilaCopy.feitoLabel(etapa);
  if (op.metaLt != null && op.metaLt > 0) {
    parts.push(
      `${feitoLabel} ${formatCompactNumber(op.feitoLt)}/${formatCompactNumber(op.metaLt)} LT`,
    );
  } else if (op.feitoLt > 0) {
    parts.push(`${feitoLabel} ${formatLt(op.feitoLt)}`);
  }
  return parts.join(' · ');
}

export default function PainelEtapaTvFilaOpCard({
  etapa,
  op,
  identity,
  showTipoEstoqueMarcaBadge = false,
}: PainelEtapaTvFilaOpCardProps) {
  const secondary = secondaryLine(etapa, op);
  const prontoCaption = PainelEtapaTvFilaCopy.prontoComTempo(tempoMaisAntigo(op));

  return (
    <Card padding="none" className="shrink-0 overflow-hidden shadow-control">
      <div className="border-l-[3px] border-amber-500 px-3 py-2">
        <EtapaProductTitle
          produto={identity.produto}
          assadeira={identity.assadeira}
          assadeiraCorHex={identity.assadeiraCorHex}
          tipoEstoqueCliente={identity.tipoEstoqueCliente}
          showTipoEstoqueMarcaBadge={showTipoEstoqueMarcaBadge}
        />
        <p className="mt-1 font-mono text-xl font-bold leading-none tabular-nums text-text-strong">
          {formatLt(op.prontoLt)}
        </p>
        <p className="mt-0.5 text-xs text-text-muted">{prontoCaption}</p>
        {secondary ? (
          <p className="mt-1 truncate font-mono text-xs tabular-nums text-text-muted" title={secondary}>
            {secondary}
          </p>
        ) : null}
      </div>
    </Card>
  );
}
