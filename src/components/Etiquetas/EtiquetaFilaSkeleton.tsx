import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

export default function EtiquetaFilaSkeleton() {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      aria-busy="true"
      aria-label="Carregando fila de etiquetas"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} padding="md" className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton height="1rem" width="72%" radius="0.375rem" />
              <Skeleton height="0.75rem" width="48%" radius="0.375rem" />
            </div>
            <Skeleton height="1.25rem" width="4.5rem" radius="9999px" />
          </div>
          <Skeleton height="2.375rem" width="100%" radius="9px" className="mt-1" />
        </Card>
      ))}
    </div>
  );
}
