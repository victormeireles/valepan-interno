import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

type OrdensProducaoEmptyStateProps = {
  onNewOrder: () => void;
  onImport: () => void;
};

export default function OrdensProducaoEmptyState({
  onNewOrder,
  onImport,
}: OrdensProducaoEmptyStateProps) {
  return (
    <EmptyState
      icon="inventory_2"
      title="Nenhuma ordem para este dia"
      description="Crie uma ordem manualmente ou importe metas em lote via CSV."
      action={
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button type="button" variant="primary" icon="add" onClick={onNewOrder}>
            Nova ordem
          </Button>
          <Button type="button" variant="secondary" icon="upload_file" onClick={onImport}>
            Importar CSV
          </Button>
        </div>
      }
    />
  );
}
