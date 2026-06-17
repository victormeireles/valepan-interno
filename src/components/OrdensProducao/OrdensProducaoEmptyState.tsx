import {
  ordensProducaoPrimaryButtonClass,
  ordensProducaoSecondaryButtonClass,
} from '@/components/OrdensProducao/ordens-producao-theme';

type OrdensProducaoEmptyStateProps = {
  onNewOrder: () => void;
  onImport: () => void;
};

export default function OrdensProducaoEmptyState({
  onNewOrder,
  onImport,
}: OrdensProducaoEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span
        className="material-icons mb-4 text-5xl text-stone-300"
        aria-hidden="true"
      >
        inventory_2
      </span>
      <h2 className="text-lg font-semibold text-stone-900">
        Nenhuma ordem para este dia
      </h2>
      <p className="mt-2 max-w-md text-sm text-stone-500">
        Crie uma ordem manualmente ou importe metas em lote via CSV.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={onNewOrder} className={ordensProducaoPrimaryButtonClass}>
          <span className="material-icons text-base" aria-hidden="true">
            add
          </span>
          Nova ordem
        </button>
        <button type="button" onClick={onImport} className={ordensProducaoSecondaryButtonClass}>
          <span className="material-icons text-base" aria-hidden="true">
            upload_file
          </span>
          Importar CSV
        </button>
      </div>
    </div>
  );
}
