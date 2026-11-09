import { Button } from '@/components/ui/Button';

type FiltroDocumento = 'enviar_hoje' | 'atrasado';

type Props = {
  paraHoje: number;
  atrasados: number;
  filtro: FiltroDocumento | null;
  onFiltrar: (filtro: FiltroDocumento | null) => void;
};

export function FaltasDocumentoQuadro({ paraHoje, atrasados, filtro, onFiltrar }: Props) {
  return (
    <section className="mt-4" aria-label="Documento no período">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-stone-500 sm:text-xs">
        Documento no período
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FiltroContagem
          rotulo="Para hoje"
          total={paraHoje}
          ativo={filtro === 'enviar_hoje'}
          onFiltrar={() => onFiltrar(filtro === 'enviar_hoje' ? null : 'enviar_hoje')}
        />
        <FiltroContagem
          rotulo="Atrasados"
          total={atrasados}
          ativo={filtro === 'atrasado'}
          onFiltrar={() => onFiltrar(filtro === 'atrasado' ? null : 'atrasado')}
        />
      </div>
    </section>
  );
}

function FiltroContagem({
  rotulo,
  total,
  ativo,
  onFiltrar,
}: {
  rotulo: string;
  total: number;
  ativo: boolean;
  onFiltrar: () => void;
}) {
  const vazio = total === 0 && !ativo;
  return (
    <article
      className={[
        'flex items-center gap-3 rounded-xl border px-3 py-2.5 shadow-sm sm:px-4',
        ativo ? 'border-amber-500 bg-amber-50' : 'border-stone-200 bg-white',
      ].join(' ')}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-wide text-stone-500 sm:text-xs">{rotulo}</p>
        <p className="font-mono text-3xl font-bold leading-none tabular-nums text-stone-900">
          {total.toLocaleString('pt-BR')}
        </p>
        <p className="mt-1 text-xs text-stone-600">{ativo ? 'Estas pessoas estão na lista.' : 'Pessoas neste período.'}</p>
      </div>
      <Button
        type="button"
        size="md"
        variant="secondary"
        className="shrink-0 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
        icon={ativo ? 'close' : 'filter_alt'}
        aria-pressed={ativo}
        aria-label={ativo ? `Limpar filtro de ${rotulo}` : `Filtrar lista: ${rotulo}`}
        disabled={vazio}
        onClick={onFiltrar}
      >
        {ativo ? 'Limpar filtro' : 'Filtrar lista'}
      </Button>
    </article>
  );
}
