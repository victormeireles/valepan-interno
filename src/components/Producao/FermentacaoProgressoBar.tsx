'use client';

import VolumeTriploProgressoBar from '@/components/Producao/VolumeTriploProgressoBar';

type FermentacaoProgressoBarProps = {
  meta: number;
  massa: number;
  fermentacao: number;
  unidadeCurta: 'LT' | 'un';
  unidadesPorAssadeira?: number | null;
  variant?: 'default' | 'compact';
};

function fmtVol(n: number): string {
  const rounded = Math.abs(n % 1) < 0.05 ? Math.round(n) : n;
  return rounded.toLocaleString('pt-BR', {
    maximumFractionDigits: rounded % 1 === 0 ? 0 : 1,
  });
}

/** Quanto falta para a meta na fermentação (mesma unidade da barra: LT ou un). */
function hintFaltamFermentacao(
  meta: number,
  fermentacao: number,
  unidadeCurta: 'LT' | 'un',
): string | null {
  if (meta <= 0) return null;
  const faltam = Math.max(0, meta - fermentacao);
  if (faltam < 1e-6) {
    return 'Meta da ordem de produção de hoje atingida';
  }
  if (unidadeCurta === 'LT') {
    const palavra = Math.abs(faltam - 1) < 0.06 ? 'lata' : 'latas';
    return `Faltam ${fmtVol(faltam)} ${palavra}`;
  }
  return `Faltam ${fmtVol(faltam)} un.`;
}

export default function FermentacaoProgressoBar({
  meta,
  massa,
  fermentacao,
  unidadeCurta,
  unidadesPorAssadeira,
  variant = 'default',
}: FermentacaoProgressoBarProps) {
  const hintBelowTitle = hintFaltamFermentacao(meta, fermentacao, unidadeCurta);

  return (
    <VolumeTriploProgressoBar
      meta={meta}
      etapaAnterior={massa}
      etapaAtual={fermentacao}
      unidadeCurta={unidadeCurta}
      unidadesPorAssadeira={unidadesPorAssadeira}
      variant={variant}
      hintBelowTitle={hintBelowTitle}
      statsColumnOrder={['atual', 'anterior', 'meta']}
      labels={{
        unitLine: '',
        meta: 'Ordem de produção de hoje',
        etapaAnterior: 'Volume na etapa anterior (Massa)',
        etapaAtual: 'Fermentação concluída',
        compactAnterior: 'Anterior (Massa)',
        compactAtual: 'Fermentação',
        footer:
          variant === 'default'
            ? 'A faixa azul é o volume já registrado na etapa anterior (massa); a verde é o que já foi concluído na fermentação (soma dos lotes finalizados). A verde não ultrapassa a meta da ordem de produção de hoje; em geral é menor ou igual ao azul.'
            : null,
      }}
    />
  );
}
