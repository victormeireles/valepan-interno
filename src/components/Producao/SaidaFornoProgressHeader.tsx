'use client';

import VolumeTriploProgressoBar from '@/components/Producao/VolumeTriploProgressoBar';

type SaidaFornoProgressHeaderProps = {
  variant: 'fila' | 'ordem';
  meta: number;
  entradaForno: number;
  saidaForno: number;
  unidadesPorAssadeiraHomogenea: number | null;
  onNovoCarrinho: () => void;
  /** Ex.: ordem sem entrada no forno ainda. */
  novoCarrinhoDisabled?: boolean;
  novoCarrinhoTitle?: string;
  /** Igual à fermentação: cartões compactos na fila. */
  uiDensity?: 'default' | 'compact';
};

function fmtVol(n: number): string {
  const rounded = Math.abs(n % 1) < 0.05 ? Math.round(n) : n;
  return rounded.toLocaleString('pt-BR', {
    maximumFractionDigits: rounded % 1 === 0 ? 0 : 1,
  });
}

function hintFaltamSaida(meta: number, saida: number): string | null {
  if (meta <= 0) return null;
  const faltam = Math.max(0, meta - saida);
  if (faltam < 1e-6) {
    return 'Meta da ordem de produção de hoje atingida na saída';
  }
  const palavra = Math.abs(faltam - 1) < 0.06 ? 'lata' : 'latas';
  return `Faltam ${fmtVol(faltam)} ${palavra} na saída`;
}

/**
 * Barra em duas faixas + três cartões na mesma ordem das outras etapas:
 * saída (atual) · entrada no forno (anterior) · OP (meta).
 * Bandejas na saída contam como latas (LT).
 */
export default function SaidaFornoProgressHeader({
  variant,
  meta,
  entradaForno,
  saidaForno,
  unidadesPorAssadeiraHomogenea,
  onNovoCarrinho,
  novoCarrinhoDisabled = false,
  novoCarrinhoTitle,
  uiDensity = 'default',
}: SaidaFornoProgressHeaderProps) {
  const titulo = variant === 'fila' ? 'Saída do forno — fila geral' : 'Saída do forno — esta ordem';
  const subtitulo =
    variant === 'fila'
      ? 'Soma de todas as ordens com entrada no forno · bandejas contam como latas (LT)'
      : 'Progresso desta ordem · bandejas na saída = latas (LT)';

  const hintBelowTitle = hintFaltamSaida(meta, saidaForno);
  const triploVariant = uiDensity === 'compact' ? 'compact' : 'default';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
      <div className="mb-2 sm:mb-3">
        <p className="text-xs font-semibold leading-snug text-slate-900 sm:text-sm">{titulo}</p>
        <p className="mt-0.5 text-[10px] leading-snug text-slate-500 sm:text-xs">{subtitulo}</p>
      </div>

      <VolumeTriploProgressoBar
        meta={meta}
        etapaAnterior={entradaForno}
        etapaAtual={saidaForno}
        unidadeCurta="LT"
        unidadesPorAssadeira={unidadesPorAssadeiraHomogenea}
        variant={triploVariant}
        embedded
        hintBelowTitle={hintBelowTitle}
        statsColumnOrder={['atual', 'anterior', 'meta']}
        labels={{
          unitLine: '',
          meta: 'Ordem de produção de hoje',
          etapaAnterior: 'Volume na etapa anterior (Entrada no forno)',
          etapaAtual: 'Saída do forno concluída',
          compactAnterior: 'Ant. (Entrada)',
          compactAtual: 'Saída',
          footer:
            triploVariant === 'default'
              ? 'A faixa azul é o volume de latas já na entrada no forno; a verde é o que já saiu (bandejas = LT). Com meta definida, a verde tende a não ultrapassar a meta da ordem de produção de hoje.'
              : null,
        }}
      />

      <div className="mt-2 flex flex-col-reverse gap-2 sm:mt-3 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={onNovoCarrinho}
          disabled={novoCarrinhoDisabled}
          title={novoCarrinhoTitle ?? 'Registrar carrinho saindo do forno'}
          aria-label="Novo carrinho — registrar saída"
          className="inline-flex w-full shrink-0 items-center justify-center gap-1 rounded-xl border-2 border-emerald-300 bg-gradient-to-b from-emerald-50 to-teal-50 px-3 py-2 text-xs font-bold text-emerald-900 shadow-sm transition-colors hover:from-emerald-100 hover:to-teal-100 disabled:pointer-events-none disabled:opacity-40 sm:w-auto sm:gap-1.5 sm:rounded-2xl sm:px-4 sm:py-2.5 sm:text-sm"
        >
          <span className="material-icons text-lg leading-none sm:text-2xl" aria-hidden>
            outbox
          </span>
          Novo carrinho
        </button>
      </div>
    </div>
  );
}
